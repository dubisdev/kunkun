/** @type {import('next').NextConfig} */
const nextConfig = {
	output: "export",
	// TODO: change this to your identifier
	basePath: `/{{projectName}}/out`,
	transpilePackages: ["@kksh/api", "comlink-stdio"]
}

export default nextConfig
