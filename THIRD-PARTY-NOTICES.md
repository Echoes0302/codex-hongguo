# Sources and third-party components

## dsh-hongguo

- Author: frostming
- Source: https://github.com/frostming/dsh-hongguo
- Pinned commit: `043c675d5d9b0d70b3e317257ab940d79fc05282`
- License at packaging: no license declared in the upstream repository.

This project is an independently packaged Codex adapter for that project. The upstream repository, its player source, its vendored media libraries and the generated player bundle are not included in this repository or its source release. The setup script obtains the pinned upstream checkout directly from the original repository on the installing user's machine. The MIT license in this repository does not license any upstream material or media.

## npm dependencies

Installed separately by npm; not bundled into this source repository:

| Package | License | Source |
| --- | --- | --- |
| openhongguo 0.1.0 | Apache-2.0 | https://github.com/beilunyang/openhongguo |
| @modelcontextprotocol/sdk | MIT | https://github.com/modelcontextprotocol/typescript-sdk |
| @modelcontextprotocol/ext-apps | MIT | https://github.com/modelcontextprotocol/ext-apps |
| React / React DOM | MIT | https://github.com/facebook/react |
| esbuild | MIT | https://github.com/evanw/esbuild |
| Zod | MIT | https://github.com/colinhacks/zod |
| proper-lockfile | MIT | https://github.com/moxystudio/node-proper-lockfile |

Each package's own license remains authoritative, including its transitive dependencies. ffmpeg is an independently installed system prerequisite; this repository does not redistribute an ffmpeg binary.
