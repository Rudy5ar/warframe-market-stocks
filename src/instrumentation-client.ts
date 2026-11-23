import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    { path: "/signup", method: "POST" },
    { path: "/forgot-password", method: "POST" },
  ],
});
