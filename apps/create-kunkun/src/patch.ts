import { $ } from "bun"
import { execSync } from "child_process"
import path from "path"
import { ExtPackageJson } from "@kksh/api/models"
import fs from "fs-extra"
import Handlebars from "handlebars"
import { flatten, safeParse } from "valibot"
import { isProduction } from "./constants"
import { findPkgVersions } from "./utils"

/* -------------------------------------------------------------------------- */
/*                              Worker Extension                              */
/* -------------------------------------------------------------------------- */
export function cleanExtension(dir: string) {
	let toRemove = ["node_modules", "bun.lockb", "dist", "stats.html", ".turbo"]
	toRemove = toRemove.map((folder) => path.join(dir, folder))
	toRemove.forEach((dir) => {
		if (fs.existsSync(dir)) {
			//   console.log("Removing: ", dir)
			fs.removeSync(dir)
		}
	})
}

export function patchManifestJsonSchema(pkgJsonPath: string) {
	const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"))
	pkgJson["$schema"] = "https://schema.kunkun.sh"
	fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
}

/**
 * Remove workspace:* dependencies and add dependencies with proper versions
 * This should be run only in development mode
 * @param pkgJsonPath path to created template's package.json
 * @param kkApiVersion @kksh/api version with the current create-kunkun version
 */
export async function patchPkgJsonDep(pkgJsonPath: string) {
	if (isProduction) {
		throw new Error("This function is only available in development mode")
	}
	const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"))
	pkgJson.name = `{{projectName}}`
	pkgJson.kunkun.identifier = `{{projectName}}`
	const monorepoPkgVersions = await findPkgVersions()
	for (const [dep, v] of Object.entries(pkgJson.dependencies)) {
		if ((v as string).startsWith("workspace:")) {
			if (!monorepoPkgVersions[dep]) {
				console.error(`Package ${dep} not found in monorepo`)
				process.exit(1)
			}
			pkgJson.dependencies[dep] = monorepoPkgVersions[dep]
		}
	}

	fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
}

export function validatePackageJson(pkgJsonPath: string) {
	const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"))
	const parseRes = safeParse(ExtPackageJson, pkgJson)
	if (!parseRes.success) {
		console.error(
			`Unexpected Error: Invalid package.json: ${flatten<typeof ExtPackageJson>(parseRes.issues)}`
		)
		process.exit(1)
	}
}

export function patchInstallAPI(dir: string) {
	// cd into the directory and run `npm install`, and run `npm install @kksh/react`
	console.info(`Running: npm install`)
	execSync("npm install", { cwd: dir, stdio: "inherit" })
	// TODO: Uncomment the following line after @kksh/react is published
	// console.info(`Running: npm install @kksh/react`)
	// execSync("npm install @kksh/react", { cwd: dir, stdio: "inherit" })
}

export function patchHBS(filePath: string, data: Record<string, any>) {
	if (!fs.existsSync(filePath)) {
		console.error(`Patch HBS: File ${filePath} not found`)
		process.exit(1)
	}
	const template = Handlebars.compile(fs.readFileSync(filePath, "utf-8"))
	const result = template(data)
	fs.writeFileSync(filePath, result)
}
