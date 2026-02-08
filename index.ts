import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';

const server = new McpServer({
	name: 'docker-mcp-server',
	version: '1.0.0',
	description: 'MCP server for Docker container management',
});

// Helper function to run docker commands
async function runDockerCommand(args: string[]): Promise<string> {
	const proc = Bun.spawn(['docker', ...args], {
		stdout: 'pipe',
		stderr: 'pipe',
	});

	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		throw new Error(
			stderr || `Docker command failed with exit code ${exitCode}`,
		);
	}

	return stdout;
}

// ============================================
// CONTAINER TOOLS
// ============================================

// List all containers
server.registerTool(
	'list_containers',
	{
		inputSchema: {
			all: z
				.boolean()
				.optional()
				.describe('Show all containers (default shows just running)'),
			format: z
				.enum(['table', 'json'])
				.optional()
				.describe('Output format (default: json)'),
		},
	},
	async ({all, format}) => {
		const args = ['ps'];
		if (all) args.push('-a');
		args.push(
			'--format',
			format === 'table'
				? 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
				: 'json',
		);

		const output = await runDockerCommand(args);
		return {
			content: [{type: 'text', text: output || 'No containers found'}],
		};
	},
);

// Get container logs
server.registerTool(
	'get_container_logs',
	{
		inputSchema: {
			container: z.string().describe('Container ID or name'),
			tail: z
				.number()
				.optional()
				.describe('Number of lines to show from the end of the logs'),
			since: z
				.string()
				.optional()
				.describe(
					"Show logs since timestamp (e.g., '2024-01-01T00:00:00' or '10m')",
				),
			timestamps: z.boolean().optional().describe('Show timestamps'),
		},
	},
	async ({container, tail, since, timestamps}) => {
		const args = ['logs'];
		if (tail) args.push('--tail', tail.toString());
		if (since) args.push('--since', since);
		if (timestamps) args.push('--timestamps');
		args.push(container);

		const output = await runDockerCommand(args);
		return {
			content: [{type: 'text', text: output || 'No logs available'}],
		};
	},
);

// Start a container
server.registerTool(
	'start_container',
	{
		inputSchema: {
			container: z.string().describe('Container ID or name'),
		},
	},
	async ({container}) => {
		await runDockerCommand(['start', container]);
		return {
			content: [
				{type: 'text', text: `Container '${container}' started successfully`},
			],
		};
	},
);

// Stop a container
server.registerTool(
	'stop_container',
	{
		inputSchema: {
			container: z.string().describe('Container ID or name'),
			time: z
				.number()
				.optional()
				.describe('Seconds to wait before killing the container'),
		},
	},
	async ({container, time}) => {
		const args = ['stop'];
		if (time !== undefined) args.push('-t', time.toString());
		args.push(container);

		await runDockerCommand(args);
		return {
			content: [
				{type: 'text', text: `Container '${container}' stopped successfully`},
			],
		};
	},
);

// Restart a container
server.registerTool(
	'restart_container',
	{
		inputSchema: {
			container: z.string().describe('Container ID or name'),
			time: z
				.number()
				.optional()
				.describe('Seconds to wait before killing the container'),
		},
	},
	async ({container, time}) => {
		const args = ['restart'];
		if (time !== undefined) args.push('-t', time.toString());
		args.push(container);

		await runDockerCommand(args);
		return {
			content: [
				{
					type: 'text',
					text: `Container '${container}' restarted successfully`,
				},
			],
		};
	},
);

// Remove a container
server.registerTool(
	'remove_container',
	{
		inputSchema: {
			container: z.string().describe('Container ID or name'),
			force: z
				.boolean()
				.optional()
				.describe('Force removal of a running container'),
			volumes: z
				.boolean()
				.optional()
				.describe('Remove anonymous volumes associated with the container'),
		},
	},
	async ({container, force, volumes}) => {
		const args = ['rm'];
		if (force) args.push('-f');
		if (volumes) args.push('-v');
		args.push(container);

		await runDockerCommand(args);
		return {
			content: [
				{type: 'text', text: `Container '${container}' removed successfully`},
			],
		};
	},
);

// Inspect a container
server.registerTool(
	'inspect_container',
	{
		inputSchema: {
			container: z.string().describe('Container ID or name'),
		},
	},
	async ({container}) => {
		const output = await runDockerCommand(['inspect', container]);
		return {
			content: [{type: 'text', text: output}],
		};
	},
);

// Execute command in container
server.registerTool(
	'exec_in_container',
	{
		inputSchema: {
			container: z.string().describe('Container ID or name'),
			command: z.string().describe('Command to execute'),
			workdir: z
				.string()
				.optional()
				.describe('Working directory inside the container'),
			user: z.string().optional().describe('Username or UID'),
		},
	},
	async ({container, command, workdir, user}) => {
		const args = ['exec'];
		if (workdir) args.push('-w', workdir);
		if (user) args.push('-u', user);
		args.push(container, 'sh', '-c', command);

		const output = await runDockerCommand(args);
		return {
			content: [
				{
					type: 'text',
					text: output || 'Command executed successfully (no output)',
				},
			],
		};
	},
);

// ============================================
// IMAGE TOOLS
// ============================================

// List images
server.registerTool(
	'list_images',
	{
		inputSchema: {
			all: z
				.boolean()
				.optional()
				.describe('Show all images (default hides intermediate images)'),
		},
	},
	async ({all}) => {
		const args = ['images', '--format', 'json'];
		if (all) args.push('-a');

		const output = await runDockerCommand(args);
		return {
			content: [{type: 'text', text: output || 'No images found'}],
		};
	},
);

// Pull an image
server.registerTool(
	'pull_image',
	{
		inputSchema: {
			image: z
				.string()
				.describe("Image name (e.g., 'nginx:latest', 'ubuntu:22.04')"),
		},
	},
	async ({image}) => {
		const output = await runDockerCommand(['pull', image]);
		return {
			content: [{type: 'text', text: output}],
		};
	},
);

// Remove an image
server.registerTool(
	'remove_image',
	{
		inputSchema: {
			image: z.string().describe('Image ID or name'),
			force: z.boolean().optional().describe('Force removal of the image'),
		},
	},
	async ({image, force}) => {
		const args = ['rmi'];
		if (force) args.push('-f');
		args.push(image);

		await runDockerCommand(args);
		return {
			content: [{type: 'text', text: `Image '${image}' removed successfully`}],
		};
	},
);

// ============================================
// RUN CONTAINER TOOL
// ============================================

// Run a new container
server.registerTool(
	'run_container',
	{
		inputSchema: {
			image: z.string().describe('Image to run'),
			name: z.string().optional().describe('Assign a name to the container'),
			detach: z
				.boolean()
				.optional()
				.describe('Run container in background (default: true)'),
			ports: z
				.array(z.string())
				.optional()
				.describe("Publish ports (e.g., ['8080:80', '443:443'])"),
			env: z
				.array(z.string())
				.optional()
				.describe("Set environment variables (e.g., ['KEY=value'])"),
			volumes: z
				.array(z.string())
				.optional()
				.describe("Bind mount volumes (e.g., ['/host/path:/container/path'])"),
			network: z.string().optional().describe('Connect to a network'),
			command: z
				.string()
				.optional()
				.describe('Command to run in the container'),
			rm: z
				.boolean()
				.optional()
				.describe('Automatically remove the container when it exits'),
		},
	},
	async ({
		image,
		name,
		detach = true,
		ports,
		env,
		volumes,
		network,
		command,
		rm,
	}) => {
		const args = ['run'];

		if (detach) args.push('-d');
		if (name) args.push('--name', name);
		if (rm) args.push('--rm');
		if (network) args.push('--network', network);

		ports?.forEach(p => args.push('-p', p));
		env?.forEach(e => args.push('-e', e));
		volumes?.forEach(v => args.push('-v', v));

		args.push(image);

		if (command) args.push(...command.split(' '));

		const output = await runDockerCommand(args);
		return {
			content: [{type: 'text', text: `Container started: ${output.trim()}`}],
		};
	},
);

// ============================================
// SYSTEM TOOLS
// ============================================

// List volumes
server.registerTool('list_volumes', {}, async () => {
	const output = await runDockerCommand(['volume', 'ls', '--format', 'json']);
	return {
		content: [{type: 'text', text: output || 'No volumes found'}],
	};
});

// List networks
server.registerTool('list_networks', {}, async () => {
	const output = await runDockerCommand(['network', 'ls', '--format', 'json']);
	return {
		content: [{type: 'text', text: output || 'No networks found'}],
	};
});

// Docker system info
server.registerTool('system_info', {}, async () => {
	const output = await runDockerCommand(['info', '--format', 'json']);
	return {
		content: [{type: 'text', text: output}],
	};
});

// Docker system prune
server.registerTool(
	'system_prune',
	{
		inputSchema: {
			all: z
				.boolean()
				.optional()
				.describe('Remove all unused images, not just dangling ones'),
			volumes: z.boolean().optional().describe('Prune volumes'),
			force: z
				.boolean()
				.optional()
				.describe('Do not prompt for confirmation (default: true)'),
		},
	},
	async ({all, volumes, force = true}) => {
		const args = ['system', 'prune'];
		if (all) args.push('-a');
		if (volumes) args.push('--volumes');
		if (force) args.push('-f');

		const output = await runDockerCommand(args);
		return {
			content: [{type: 'text', text: output}],
		};
	},
);

// ============================================
// COMPOSE TOOLS
// ============================================

// Docker Compose up
server.registerTool(
	'compose_up',
	{
		inputSchema: {
			file: z
				.string()
				.optional()
				.describe('Path to compose file (default: docker-compose.yml)'),
			detach: z
				.boolean()
				.optional()
				.describe('Run in background (default: true)'),
			build: z.boolean().optional().describe('Build images before starting'),
			services: z
				.array(z.string())
				.optional()
				.describe('Specific services to start'),
		},
	},
	async ({file, detach = true, build, services}) => {
		const args = ['compose'];
		if (file) args.push('-f', file);
		args.push('up');
		if (detach) args.push('-d');
		if (build) args.push('--build');
		if (services) args.push(...services);

		const output = await runDockerCommand(args);
		return {
			content: [{type: 'text', text: output || 'Compose services started'}],
		};
	},
);

// Docker Compose down
server.registerTool(
	'compose_down',
	{
		inputSchema: {
			file: z
				.string()
				.optional()
				.describe('Path to compose file (default: docker-compose.yml)'),
			volumes: z.boolean().optional().describe('Remove named volumes'),
			removeOrphans: z
				.boolean()
				.optional()
				.describe(
					'Remove containers for services not defined in the Compose file',
				),
		},
	},
	async ({file, volumes, removeOrphans}) => {
		const args = ['compose'];
		if (file) args.push('-f', file);
		args.push('down');
		if (volumes) args.push('-v');
		if (removeOrphans) args.push('--remove-orphans');

		const output = await runDockerCommand(args);
		return {
			content: [{type: 'text', text: output || 'Compose services stopped'}],
		};
	},
);

// Docker Compose ps
server.registerTool(
	'compose_ps',
	{
		inputSchema: {
			file: z
				.string()
				.optional()
				.describe('Path to compose file (default: docker-compose.yml)'),
			all: z.boolean().optional().describe('Show all stopped containers'),
		},
	},
	async ({file, all}) => {
		const args = ['compose'];
		if (file) args.push('-f', file);
		args.push('ps');
		if (all) args.push('-a');
		args.push('--format', 'json');

		const output = await runDockerCommand(args);
		return {
			content: [{type: 'text', text: output || 'No compose services found'}],
		};
	},
);

// Docker Compose logs
server.registerTool(
	'compose_logs',
	{
		inputSchema: {
			file: z
				.string()
				.optional()
				.describe('Path to compose file (default: docker-compose.yml)'),
			services: z
				.array(z.string())
				.optional()
				.describe('Specific services to get logs from'),
			tail: z
				.number()
				.optional()
				.describe('Number of lines to show from the end of the logs'),
			timestamps: z.boolean().optional().describe('Show timestamps'),
		},
	},
	async ({file, services, tail, timestamps}) => {
		const args = ['compose'];
		if (file) args.push('-f', file);
		args.push('logs');
		if (tail) args.push('--tail', tail.toString());
		if (timestamps) args.push('--timestamps');
		if (services) args.push(...services);

		const output = await runDockerCommand(args);
		return {
			content: [{type: 'text', text: output || 'No logs available'}],
		};
	},
);

// ============================================
// START SERVER
// ============================================

const transport = new StdioServerTransport();
await server.connect(transport);
