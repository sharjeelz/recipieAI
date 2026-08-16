import pytest

URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


@pytest.mark.asyncio
async def test_stats_empty(client, auth_headers):
    r = await client.get("/stats", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["recipes"] == 0
    assert body["jobs"]["total"] == 0
    assert body["spend_usd"]["total"] == 0
    # Undefined rather than a divide-by-zero when nothing exists yet.
    assert body["spend_usd"]["per_recipe"] is None


@pytest.mark.asyncio
async def test_stats_counts_extractions(client, auth_headers):
    await client.post("/recipes", json={"url": URL}, headers=auth_headers)
    await client.post("/recipes", json={"url": URL}, headers=auth_headers)

    r = await client.get("/stats", headers=auth_headers)
    body = r.json()

    assert body["recipes"] == 2
    assert body["jobs"]["total"] == 2
    assert body["jobs"]["failed"] == 0
    assert body["tokens"]["input"] > 0
    assert body["tokens"]["output"] > 0


@pytest.mark.asyncio
async def test_stats_does_not_double_count_job_and_recipe(client, auth_headers):
    """A successful extraction writes the same cost to both the job and the
    recipe. The total must reflect it once, not twice."""
    await client.post("/recipes", json={"url": URL}, headers=auth_headers)

    stats = (await client.get("/stats", headers=auth_headers)).json()

    recipes = (await client.get("/recipes/mine", headers=auth_headers)).json()
    recipe = (
        await client.get(f"/recipes/{recipes[0]['id']}", headers=auth_headers)
    ).json()

    assert stats["spend_usd"]["extraction"] == pytest.approx(
        recipe["cost_usd"] or 0, abs=1e-6
    )
    assert stats["tokens"]["input"] == recipe["llm_input_tokens"]
    assert stats["tokens"]["output"] == recipe["llm_output_tokens"]


@pytest.mark.asyncio
async def test_stats_is_per_user(client, auth_headers, second_auth_headers):
    await client.post("/recipes", json={"url": URL}, headers=auth_headers)

    other = (await client.get("/stats", headers=second_auth_headers)).json()
    assert other["recipes"] == 0
    assert other["jobs"]["total"] == 0
    assert other["spend_usd"]["total"] == 0


@pytest.mark.asyncio
async def test_stats_requires_auth(client):
    r = await client.get("/stats")
    assert r.status_code == 401
