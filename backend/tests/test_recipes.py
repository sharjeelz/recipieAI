import pytest

URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


@pytest.mark.asyncio
async def test_full_url_to_recipe_flow(client, auth_headers):
    r = await client.post("/recipes", json={"url": URL}, headers=auth_headers)
    assert r.status_code == 202, r.text
    job_id = r.json()["job_id"]

    # Inline runner has already processed the job by the time POST returns.
    r = await client.get(f"/jobs/{job_id}", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "done"
    recipe_id = body["recipe_id"]
    assert recipe_id

    r = await client.get(f"/recipes/{recipe_id}", headers=auth_headers)
    assert r.status_code == 200
    recipe = r.json()
    assert recipe["title"] == "Garlic Butter Pasta"
    assert recipe["llm_provider"] == "fake"
    assert len(recipe["ingredients"]) == 3
    assert len(recipe["steps"]) == 3
    assert recipe["ingredients"][0]["item"] == "spaghetti"
    assert recipe["steps"][0]["position"] == 0


@pytest.mark.asyncio
async def test_list_mine(client, auth_headers):
    await client.post("/recipes", json={"url": URL}, headers=auth_headers)
    await client.post("/recipes", json={"url": URL}, headers=auth_headers)
    r = await client.get("/recipes/mine", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) == 2


@pytest.mark.asyncio
async def test_private_recipe_hidden_from_other_user(client, auth_headers, creds):
    r = await client.post("/recipes", json={"url": URL}, headers=auth_headers)
    job_id = r.json()["job_id"]
    recipe_id = (await client.get(f"/jobs/{job_id}", headers=auth_headers)).json()["recipe_id"]

    other = {"email": "other@example.com", "password": "hunter2hunter2"}
    r = await client.post("/auth/register", json=other)
    other_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = await client.get(f"/recipes/{recipe_id}", headers=other_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_patch_recipe(client, auth_headers):
    r = await client.post("/recipes", json={"url": URL}, headers=auth_headers)
    job_id = r.json()["job_id"]
    recipe_id = (await client.get(f"/jobs/{job_id}", headers=auth_headers)).json()["recipe_id"]

    r = await client.patch(
        f"/recipes/{recipe_id}",
        json={"title": "My Tweaked Pasta", "visibility": "public"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json()["title"] == "My Tweaked Pasta"
    assert r.json()["visibility"] == "public"


@pytest.mark.asyncio
async def test_share_and_public_read(client, auth_headers):
    r = await client.post("/recipes", json={"url": URL}, headers=auth_headers)
    job_id = r.json()["job_id"]
    recipe_id = (await client.get(f"/jobs/{job_id}", headers=auth_headers)).json()["recipe_id"]

    r = await client.post(f"/recipes/{recipe_id}/share", headers=auth_headers)
    assert r.status_code == 200
    token = r.json()["token"]

    # No auth required for share reads
    r = await client.get(f"/share/{token}")
    assert r.status_code == 200
    assert r.json()["title"] == "Garlic Butter Pasta"


@pytest.mark.asyncio
async def test_save_public_recipe(client, auth_headers):
    r = await client.post("/recipes", json={"url": URL}, headers=auth_headers)
    job_id = r.json()["job_id"]
    recipe_id = (await client.get(f"/jobs/{job_id}", headers=auth_headers)).json()["recipe_id"]
    await client.patch(
        f"/recipes/{recipe_id}", json={"visibility": "public"}, headers=auth_headers
    )

    other = {"email": "other@example.com", "password": "hunter2hunter2"}
    r = await client.post("/auth/register", json=other)
    other_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = await client.post(f"/recipes/{recipe_id}/save", headers=other_headers)
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_delete_recipe(client, auth_headers):
    r = await client.post("/recipes", json={"url": URL}, headers=auth_headers)
    job_id = r.json()["job_id"]
    recipe_id = (await client.get(f"/jobs/{job_id}", headers=auth_headers)).json()["recipe_id"]

    r = await client.delete(f"/recipes/{recipe_id}", headers=auth_headers)
    assert r.status_code == 204
    r = await client.get(f"/recipes/{recipe_id}", headers=auth_headers)
    assert r.status_code == 404
