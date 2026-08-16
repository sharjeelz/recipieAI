import pytest

URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


async def _make_recipe(client, headers) -> str:
    r = await client.post("/recipes", json={"url": URL}, headers=headers)
    job = await client.get(f"/jobs/{r.json()['job_id']}", headers=headers)
    return job.json()["recipe_id"]


@pytest.mark.asyncio
async def test_recipe_starts_unrated(client, auth_headers):
    rid = await _make_recipe(client, auth_headers)
    body = (await client.get(f"/recipes/{rid}", headers=auth_headers)).json()
    assert body["my_rating"] is None
    assert body["my_cooked_count"] == 0
    assert body["my_last_cooked_at"] is None


@pytest.mark.asyncio
async def test_set_and_change_rating(client, auth_headers):
    rid = await _make_recipe(client, auth_headers)

    r = await client.put(f"/recipes/{rid}/rating", json={"rating": 4}, headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["rating"] == 4

    r = await client.put(f"/recipes/{rid}/rating", json={"rating": 2}, headers=auth_headers)
    assert r.json()["rating"] == 2

    body = (await client.get(f"/recipes/{rid}", headers=auth_headers)).json()
    assert body["my_rating"] == 2


@pytest.mark.asyncio
async def test_rating_can_be_cleared(client, auth_headers):
    rid = await _make_recipe(client, auth_headers)
    await client.put(f"/recipes/{rid}/rating", json={"rating": 5}, headers=auth_headers)

    r = await client.put(f"/recipes/{rid}/rating", json={"rating": None}, headers=auth_headers)
    assert r.json()["rating"] is None


@pytest.mark.asyncio
@pytest.mark.parametrize("bad", [0, 6, -1, 99])
async def test_rating_out_of_range_rejected(client, auth_headers, bad):
    rid = await _make_recipe(client, auth_headers)
    r = await client.put(f"/recipes/{rid}/rating", json={"rating": bad}, headers=auth_headers)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_cooked_increments_and_stamps(client, auth_headers):
    rid = await _make_recipe(client, auth_headers)

    r = await client.post(f"/recipes/{rid}/cooked", headers=auth_headers)
    assert r.status_code == 200
    first = r.json()
    assert first["cooked_count"] == 1
    assert first["last_cooked_at"] is not None

    r = await client.post(f"/recipes/{rid}/cooked", headers=auth_headers)
    assert r.json()["cooked_count"] == 2


@pytest.mark.asyncio
async def test_rating_and_cooking_are_independent(client, auth_headers):
    """Logging a cook must not wipe the rating, and re-rating must not
    reset the cook count."""
    rid = await _make_recipe(client, auth_headers)

    await client.post(f"/recipes/{rid}/cooked", headers=auth_headers)
    await client.put(f"/recipes/{rid}/rating", json={"rating": 5}, headers=auth_headers)

    r = await client.post(f"/recipes/{rid}/cooked", headers=auth_headers)
    assert r.json() == {**r.json(), "rating": 5, "cooked_count": 2}

    r = await client.put(f"/recipes/{rid}/rating", json={"rating": 3}, headers=auth_headers)
    assert r.json()["cooked_count"] == 2
    assert r.json()["rating"] == 3


@pytest.mark.asyncio
async def test_ratings_are_per_user(client, auth_headers, second_auth_headers):
    rid = await _make_recipe(client, auth_headers)
    await client.patch(
        f"/recipes/{rid}", json={"visibility": "public"}, headers=auth_headers
    )

    await client.put(f"/recipes/{rid}/rating", json={"rating": 5}, headers=auth_headers)
    await client.put(f"/recipes/{rid}/rating", json={"rating": 1}, headers=second_auth_headers)

    mine = (await client.get(f"/recipes/{rid}", headers=auth_headers)).json()
    theirs = (await client.get(f"/recipes/{rid}", headers=second_auth_headers)).json()
    assert mine["my_rating"] == 5
    assert theirs["my_rating"] == 1


@pytest.mark.asyncio
async def test_rating_appears_in_library_list(client, auth_headers):
    rid = await _make_recipe(client, auth_headers)
    await client.put(f"/recipes/{rid}/rating", json={"rating": 4}, headers=auth_headers)
    await client.post(f"/recipes/{rid}/cooked", headers=auth_headers)

    rows = (await client.get("/recipes/mine", headers=auth_headers)).json()
    assert len(rows) == 1
    assert rows[0]["my_rating"] == 4
    assert rows[0]["my_cooked_count"] == 1


@pytest.mark.asyncio
async def test_cannot_rate_someone_elses_private_recipe(
    client, auth_headers, second_auth_headers
):
    rid = await _make_recipe(client, auth_headers)
    r = await client.put(
        f"/recipes/{rid}/rating", json={"rating": 5}, headers=second_auth_headers
    )
    assert r.status_code == 404
