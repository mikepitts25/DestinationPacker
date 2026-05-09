import pytest

from app.config import Settings
from app.main import _validate_production_safety


@pytest.mark.parametrize(
    "secret_key",
    [
        "",
        "dev_secret_key_change_in_production",
        "dev_secret_change_in_production",
        "change_me_in_production",
        "PLACEHOLDER_secret_key_64chars",
    ],
)
def test_production_rejects_placeholder_secret_keys(secret_key):
    settings = Settings(environment="production", secret_key=secret_key)

    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        _validate_production_safety(settings)


def test_development_allows_placeholder_secret_keys():
    settings = Settings(environment="development", secret_key="change_me_in_production")

    _validate_production_safety(settings)
