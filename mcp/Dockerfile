FROM python:3.13-slim

WORKDIR /srv/mcp

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
# Strip CRLF when the repo is checked out on Windows (avoids "no such file or directory").
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

ENV MANUAL_WEB_API_URL=http://backend:8000 \
    MCP_HOST=0.0.0.0 \
    MCP_PORT=8001 \
    MCP_TRANSPORT=sse \
    MCP_ADMIN_EMAIL=mcp-admin@example.com \
    MCP_ADMIN_PASSWORD=mcp-dev-password-min-16-chars

EXPOSE 8001

ENTRYPOINT ["/srv/mcp/entrypoint.sh"]
