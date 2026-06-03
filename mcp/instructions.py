"""Server-level MCP instructions exposed to the host (Cursor, etc.)."""

SERVER_INSTRUCTIONS = """\
Manual Web MCP — 제품 매뉴얼(마크다운 문서·업로드)을 HTTP API로 읽고 씁니다.

## 인증
- 조회 도구는 공개 카탈로그 정책에 따라 로그인 없이 동작할 수 있습니다.
- 생성·수정·삭제·import·미디어 도구는 `MANUAL_WEB_EMAIL`, `MANUAL_WEB_PASSWORD`(관리자)가 필요합니다.
- 기본 MCP 관리자 이메일은 `mcp-admin@example.com` (`.local` 도메인은 API 검증에 실패함).

## 제품·버전
- 모든 도구는 표시 이름이 아니라 `product_slug`를 씁니다. 사용자가 제품 이름만 주면 \
`list_products`로 `name` → `slug`를 맞춥니다.
- `version_slug` 기본값 `"latest"` = 관리자 UI **작업중** working copy (`is_latest=true`). \
미발행 편집은 여기에 넣습니다.
- 발행 스냅샷·초안 스냅샷은 실제 slug(예: `2026.06.03`)를 씁니다. `latest`가 아닙니다.
- `latest`를 수정해도 공개 사이트에 자동 발행되지 않습니다.

## 워크플로 선택
| 목적 | 도구 |
|------|------|
| 로컬 `.md`(+ 옆 이미지) 가져오기 | `import_markdown_file` |
| `.md` 트리 일괄 가져오기 | `import_markdown_directory` |
| 채팅/붙여넣기 본문으로 새 페이지 | `create_document` (기존이면 `update_document` + `document_id`) |
| 디스크 파일로 slug 기준 덮어쓰기 | `import_markdown_file` (slug upsert) |

slug가 이미 있으면 `create_document`는 실패합니다. 덮어쓰기는 import를 쓰세요.

## 마크다운 이미지
- `import_*` + `upload_local_images=true`(기본): md 파일 옆 상대 경로 `![](./a.png)`를 \
업로드 후 `/uploads/...` URL로 치환합니다.
- `create_document` / `update_document`에 본문만 넣을 때: 상대 경로 이미지는 **자동 업로드 안 됨**. \
`upload_media` → 응답 `url`을 md에 넣은 뒤 저장하세요.
- `/uploads/`, `http://`, `https://`로 시작하는 ref는 그대로 둡니다.

## 경로 (Docker MCP)
- 저장소는 `/workspace`에 read-only 마운트됩니다. `/workspace/docs/page.md` 형태를 쓰세요.
- 로컬 stdio: `python mcp/server.py`를 실행하는 머신에서 읽을 수 있는 절대 경로를 씁니다.

## slug
- 문서 slug: 영문·숫자·`.` `_` `-` 만.
- `import_markdown_directory`: 폴더 구조가 parent slug로 매핑됩니다.

## 권장 순서 (작업중 버전에 페이지 추가)
1. `list_products` → `product_slug` 확인
2. `list_documents(product_slug, version_slug="latest")` → slug 중복·`parent_slug` 확인
3. `import_markdown_file` 또는 `upload_media` 후 `create_document(..., version_slug="latest")`
4. `get_document`로 확인

## 응답
- 도구는 JSON 문자열을 반환합니다. 실패는 보통 `{"error": "..."}` 형태입니다.
"""
