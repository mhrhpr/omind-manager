from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_prefix='OMIND_')

    app_name: str = 'OMIND API'
    environment: str = 'development'
    database_url: str = 'postgresql+psycopg://omind:omind@localhost:5432/omind'
    object_storage_dir: str = './storage'
    s3_bucket: str | None = None
    s3_endpoint_url: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    cors_origins: str = 'http://localhost:3000'
    max_upload_bytes: int = 20 * 1024 * 1024

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]


settings = Settings()
