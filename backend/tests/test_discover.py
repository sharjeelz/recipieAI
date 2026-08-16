import pytest

URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


async def _make_recipe(client, headers) -> str:
    r = await client.post("/recipes", json={"url": URL}, headers=headers)
    job = await client.get(f"/jobs/{r.json()['job_id']}", headers=headers)
    return job.json()["recipe_id"]


@pytest.mark.asyncio
async def test_private_recipes_are_not_discoverable(client, auth_headers, second_auth_headers):
    await _make_recipe(client, auth_headers)

    r = await client.get("/recipes/public", headers=second_auth_headers)
    assert r.status_code == 200, r.text
    assert r.json() == []


@pytest.mark.asyncio
async def test_public_recipe_appears_with_author(
    client, auth_headers, second_auth_headers
):
    recipe_id = await _make_recipe(client, auth_headers)
    await client.patch(
        f"/recipes/{recipe_id}", json={"visibility": "public"}, headers=auth_headers
    )

    rows = (await client.get("/recipes/public", headers=second_auth_headers)).json()
    assert len(rows) == 1
    assert rows[0]["id"] == recipe_id
    assert rows[0]["author"] == "Cook"
    # Seen from the other account, so it's neither theirs nor saved yet.
    assert rows[0]["is_mine"] is False
    assert rows[0]["saved"] is False

    mine = (await client.get("/recipes/public", headers=auth_headers)).json()
    assert mine[0]["is_mine"] is True


@pytest.mark.asyncio
async def test_public_search_filters_by_title(client, auth_headers, second_auth_headers):
    recipe_id = await _make_recipe(client, auth_headers)
    await client.patch(
        f"/recipes/{recipe_id}", json={"visibility": "public"}, headers=auth_headers
    )

    hit = await client.get("/recipes/public?q=garlic", headers=second_auth_headers)
    assert len(hit.json()) == 1

    miss = await client.get("/recipes/public?q=tiramisu", headers=second_auth_headers)
    assert miss.json() == []


@pytest.mark.asyncio
async def test_save_and_unsave_roundtrip(client, auth_headers, second_auth_headers):
    recipe_id = await _make_recipe(client, auth_headers)
    await client.patch(
        f"/recipes/{recipe_id}", json={"visibility": "public"}, headers=auth_headers
    )

    assert (await client.get("/recipes/saved", headers=second_auth_headers)).json() == []

    r = await client.post(f"/recipes/{recipe_id}/save", headers=second_auth_headers)
    assert r.status_code == 204

    saved = (await client.get("/recipes/saved", headers=second_auth_headers)).json()
    assert len(saved) == 1
    assert saved[0]["id"] == recipe_id
    assert saved[0]["saved"] is True

    feed = (await client.get("/recipes/public", headers=second_auth_headers)).json()
    assert feed[0]["saved"] is True

    r = await client.delete(f"/recipes/{recipe_id}/save", headers=second_auth_headers)
    assert r.status_code == 204
    assert (await client.get("/recipes/saved", headers=second_auth_headers)).json() == []

    # Unsaving twice is a no-op rather than an error.
    r = await client.delete(f"/recipes/{recipe_id}/save", headers=second_auth_headers)
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_saved_recipe_hidden_after_owner_makes_it_private(
    client, auth_headers, second_auth_headers
):
    recipe_id = await _make_recipe(client, auth_headers)
    await client.patch(
        f"/recipes/{recipe_id}", json={"visibility": "public"}, headers=auth_headers
    )
    await client.post(f"/recipes/{recipe_id}/save", headers=second_auth_headers)

    await client.patch(
        f"/recipes/{recipe_id}", json={"visibility": "private"}, headers=auth_headers
    )

    saved = (await client.get("/recipes/saved", headers=second_auth_headers)).json()
    assert saved == []


@pytest.mark.asyncio
async def test_mine_still_excludes_other_peoples_public_recipes(
    client, auth_headers, second_auth_headers
):
    recipe_id = await _make_recipe(client, auth_headers)
    await client.patch(
        f"/recipes/{recipe_id}", json={"visibility": "public"}, headers=auth_headers
    )
    await client.post(f"/recipes/{recipe_id}/save", headers=second_auth_headers)

    mine = (await client.get("/recipes/mine", headers=second_auth_headers)).json()
    assert mine == []
