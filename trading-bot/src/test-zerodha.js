import { createZerodhaTicker } from "./workers/zerodhaWorker.js";

const tokens = [738561, 256265];
const ticker = createZerodhaTicker(tokens);

ticker.on("ticks", (ticks) => {
  console.log("Ticks:", ticks);
});

ticker.connect(); 