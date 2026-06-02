from pydantic import BaseModel, model_validator


class LoginRequest(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: int | None = None
    type: str | None = None


class RefreshRequest(BaseModel):
    token: str | None = None
    refresh_token: str | None = None

    @model_validator(mode="after")
    def require_token(self):
        resolved = self.token or self.refresh_token
        if not resolved:
            raise ValueError("token or refresh_token is required")
        self.token = resolved
        return self
