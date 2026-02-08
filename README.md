# docker-mcp-server

An MCP (Model Context Protocol) server for Docker container management. This server enables AI assistants to interact with Docker through a standardized protocol.

## Features

### Container Tools

- `list_containers` - List all Docker containers (running or all)
- `get_container_logs` - Get logs from a container
- `start_container` - Start a stopped container
- `stop_container` - Stop a running container
- `restart_container` - Restart a container
- `remove_container` - Remove a container
- `inspect_container` - Get detailed container information
- `exec_in_container` - Execute a command inside a container
- `run_container` - Run a new container from an image

### Image Tools

- `list_images` - List all Docker images
- `pull_image` - Pull an image from a registry
- `remove_image` - Remove an image

### System Tools

- `list_volumes` - List all Docker volumes
- `list_networks` - List all Docker networks
- `system_info` - Get Docker system information
- `system_prune` - Remove unused Docker resources

### Docker Compose Tools

- `compose_up` - Start services defined in a compose file
- `compose_down` - Stop and remove compose services
- `compose_ps` - List compose services
- `compose_logs` - Get logs from compose services

## Prerequisites

- [Bun](https://bun.sh) runtime
- Docker installed and running

## Installation

```bash
bun install
```

## Usage

### Run the server

```bash
bun run start
```

### Development mode (with watch)

```bash
bun run dev
```

## MCP Client Configuration

### Cursor

Add to your Cursor settings (`.cursor/mcp.json`):

```json
{
	"mcpServers": {
		"docker": {
			"command": "bun",
			"args": ["run", "/path/to/docker-mcp-server/index.ts"]
		}
	}
}
```

### Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
	"mcpServers": {
		"docker": {
			"command": "bun",
			"args": ["run", "/path/to/docker-mcp-server/index.ts"]
		}
	}
}
```

## License

MIT
