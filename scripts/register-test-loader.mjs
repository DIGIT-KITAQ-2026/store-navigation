/** package.jsonの"test"スクリプトから`node --import ./scripts/register-test-loader.mjs`として読み込む。 */
import { register } from "node:module";

register("./test-loader.mjs", import.meta.url);
