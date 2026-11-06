import { isCommonAssetRequest } from "msw";
import { setupWorker } from "msw/browser";

import { mockLlmHandlers } from "./handlers";

/* The worker the Storybook iframe runs against. msw-storybook-addon starts a
   worker of its own by default; we hand it this setup instead so the initial
   handlers are ours — handlers passed to `setupWorker` act as initial
   handlers and survive the automatic reset between stories.

   Quiet + selective warning: Storybook fires a stream of internal requests
   (iframe bootstrap, vite virtual modules, HMR) that must not spam the
   console; a genuinely unmocked request still prints a warning so a story
   that forgot a handler is visible, not silently broken. */

const SB_INTERNAL_REQUEST =
  /\.eot$|\.mdx$|sb-common-assets|__webpack_hmr|iframe\.html|sb-vite|@vite|@react-refresh|\/virtual:|\.stories\./;

export async function startMockWorker() {
  const worker = setupWorker(...mockLlmHandlers);
  await worker.start({
    quiet: true,
    onUnhandledRequest(request, print) {
      if (isCommonAssetRequest(request) || SB_INTERNAL_REQUEST.test(request.url)) return;
      print.warning();
    },
  });
  return worker;
}
