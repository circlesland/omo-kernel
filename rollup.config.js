import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import livereload from "rollup-plugin-livereload";
import { terser } from "rollup-plugin-terser";
import sveltePreprocess from "svelte-preprocess";
import typescript from "@rollup/plugin-typescript";
import fs from "fs";
import path from "path";

const all = readDirectory(path.join(__dirname, "/src/quanta"));

const production = !process.env.ROLLUP_WATCH;

function readDirectory(dir, fileList = []) {
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);

    if (fs.statSync(filePath).isDirectory()) {
      fileList.push({
        name: file,
        path: filePath,
        contents: readDirectory(filePath),
      });
    } else {
      fileList.push({
        name: file,
        path: filePath,
      });
    }
  });
  return fileList;
}

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require("child_process").spawn(
        "npm",
        ["run", "start", "--", "--dev"],
        {
          stdio: ["ignore", "inherit", "inherit"],
          shell: true,
        }
      );
      process.on("SIGTERM", toExit);
      process.on("exit", toExit);
    },
  };
}

function createRollupConfig(input, name) {
  return {
    input: input,
    output: {
      sourcemap: true,
      format: "iife",
      name: name,
      file: "public/quanta/" + name + ".js",
    },
    plugins: [
      svelte({
        customElement: true,
        // enable run-time checks when not in production
        dev: !production,
        // we'll extract any component CSS out into
        // a separate file - better for performance
        // css: (css) => {
        //   css.write("public/css/" + name + ".css");
        // },
        preprocess: sveltePreprocess({
          postcss: true,
        }),
      }),

      // If you have external dependencies installed from
      // npm, you'll most likely need these plugins. In
      // some cases you'll need additional configuration -
      // consult the documentation for details:
      // https://github.com/rollup/plugins/tree/master/packages/commonjs
      resolve({
        browser: true,
        dedupe: ["svelte"],
      }),
      commonjs(),
      typescript({
        sourceMap: !production,
      }),
      // Watch the `public` directory and refresh the
      // browser on changes when not in production
      !production && livereload("public"),

      // If we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser(),
    ],
    watch: {
      clearScreen: false,
    },
  };
}

let configArr = [
  {
    input: "src/dapp.ts",
    output: {
      sourcemap: true,
      format: "iife",
      name: "dapp",
      file: "public/dapp.js",
    },
    plugins: [
      svelte({
        // enable run-time checks when not in production
        dev: !production,
        // we'll extract any component CSS out into
        // a separate file - better for performance
        // css: (css) => {
        //   css.write("public/quanta/omodapp.css");
        // },
        preprocess: sveltePreprocess({
          postcss: true,
        }),
      }),

      // If you have external dependencies installed from
      // npm, you'll most likely need these plugins. In
      // some cases you'll need additional configuration -
      // consult the documentation for details:
      // https://github.com/rollup/plugins/tree/master/packages/commonjs
      resolve({
        browser: true,
        dedupe: ["svelte"],
      }),
      commonjs(),
      typescript({
        sourceMap: !production,
      }),

      // In dev mode, call `npm run start` once
      // the bundle has been generated
      !production && serve(),

      // Watch the `public` directory and refresh the
      // browser on changes when not in production
      !production && livereload("public"),

      // If we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser(),
    ],
    watch: {
      clearScreen: false,
    },
  },
];

all
  .filter((o) => o.path.endsWith(".svelte"))
  .forEach((o) => configArr.push(createRollupConfig(o.path, o.name)));

export default configArr;
