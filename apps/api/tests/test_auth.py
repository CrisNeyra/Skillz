def test_enter_creates_new_profile(client):
    response = client.post("/auth/enter", json={"display_name": "Ana Rivera"})
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

    me = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["username"].startswith("ana_rivera") or "ana" in me.json()["username"]


def test_enter_does_not_reopen_existing_name(client):
    first = client.post("/auth/enter", json={"display_name": "Unique Name ZZ"})
    assert first.status_code == 201

    second = client.post("/auth/enter", json={"display_name": "unique name zz"})
    assert second.status_code == 409
    assert "ya existe" in second.json()["detail"].lower()


def test_register_login_and_me(client):
    register = client.post(
        "/auth/register",
        json={
            "email": "talent@example.com",
            "username": "talent_one",
            "password": "password123",
            "display_name": "Talent One",
        },
    )
    assert register.status_code == 201

    login = client.post(
        "/auth/login",
        json={"email": "talent@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    tokens = login.json()

    me = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["username"] == "talent_one"


def test_refresh_rotates_and_rejects_reuse(client):
    register = client.post(
        "/auth/register",
        json={
            "email": "rotate@example.com",
            "username": "rotate_user",
            "password": "password123",
            "display_name": "Rotate User",
        },
    )
    assert register.status_code == 201
    old_refresh = register.json()["refresh_token"]

    rotated = client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert rotated.status_code == 200
    new_refresh = rotated.json()["refresh_token"]
    assert new_refresh != old_refresh

    reuse = client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert reuse.status_code == 401

    # After reuse detection, the new refresh should also be revoked.
    follow = client.post("/auth/refresh", json={"refresh_token": new_refresh})
    assert follow.status_code == 401
