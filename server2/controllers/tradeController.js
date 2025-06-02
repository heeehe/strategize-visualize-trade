const { zerodha } = require('../config');
const { KiteConnect } = require('kiteconnect');

exports.executeTrade = async ({
  tradingsymbol,
  exchange,
  transaction_type,
  quantity,
  order_type,
  price,
  product
}) => {
  if (!tradingsymbol || !exchange || !transaction_type || !quantity || !order_type || !product) {
    return { success: false, message: "Missing required parameters" };
  }

  const { apiKey, accessToken } = zerodha;
  const kc = new KiteConnect({ api_key: apiKey });
  kc.setAccessToken(accessToken);

  try {
    const order = await kc.placeOrder("regular", {
      tradingsymbol,
      exchange,
      transaction_type,
      quantity,
      order_type,
      product,
      validity: "DAY"
    });

    return { success: true, order_id: order.order_id, message: "Order placed successfully" };
  } catch (err) {
    console.error("Trade execution error:", err.message);
    return { success: false, message: err.message };
  }
};

// --- Hardcoded Vikas Lifecare trade execution ---
// exports.executeVikasTrade = async () => {
//   try {
//     const orderId = await exports.executeTrade({
//       tradingsymbol: "VIKASECO",
//       exchange: "NSE",
//       transaction_type: "BUY",
//       quantity: 1,
//       order_type: "MARKET",
//       price: null,
//       product: "CNC"
//     });
//     console.log("Vikas Lifecare trade executed. Order ID:", orderId);
//     return orderId;
//   } catch (error) {
//     console.error("Vikas Lifecare trade execution failed:", error.message);
//     throw error;
//   }
// };