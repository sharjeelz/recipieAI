import pytest


@pytest.mark.asyncio
async def test_register_login_me(client, creds):
    r = await client.post("/auth/register", json=creds)
    assert r.status_code == 201, r.text
    tokens = r.json()
    assert tokens["access_token"] and tokens["refresh_token"]

    r = await client.post("/auth/login", json={"email": creds["email"], "password": creds["password"]})
    assert r.status_code == 200
    access = r.json()["access_token"]

    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 200
    assert r.json()["email"] == creds["email"]
    assert r.json()["display_name"] == creds["display_name"]


@pytest.mark.asyncio
async def test_duplicate_email_rejected(client, creds):
    r = await client.post("/auth/register", json=creds)
    assert r.status_code == 201
    r = await client.post("/auth/register", json=creds)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_wrong_password(client, creds):
    await client.post("/auth/register", json=creds)
    r = await client.post("/auth/login", json={"email": creds["email"], "password": "wrong-wrong"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rotates_and_works(client, creds):
    r = await client.post("/auth/register", json=creds)
    refresh = r.json()["refresh_token"]

    r = await client.post("/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200
    new_access = r.json()["access_token"]

    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {new_access}"})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_logout_invalidates_tokens(client, creds):
    r = await client.post("/auth/register", json=creds)
    tokens = r.json()
    access = tokens["access_token"]
    refresh = tokens["refresh_token"]

    r = await client.post("/auth/logout", headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 204

    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 401

    r = await client.post("/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_no_token_rejected(client):
    r = await client.get("/auth/me")
    assert r.status_code == 401
