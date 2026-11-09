// Default site settings. The admin panel only stores what you change.
// This file is also what "Reset to original" goes back to.
window.BB_DEFAULTS = {
  contact: {
    phone: "+1 (689) 282-7251",
    phoneHref: "+16892827251",
    telegram: "Josh_fred",
    telegramLink: "https://t.me/Josh_fred",
    whatsapp: ""
  },
  orders: {
    minOrder: 50,
    orderTitle: "Blinks Bakery order",
    minMsg: "Minimum order is {min}. Add {more} more to continue.",
    tgCopied: "Order copied. Paste it in the Telegram chat and hit send.",
    cartNote: "Tap a button to send us your order. We reply with payment details. Payment comes first, then we arrange delivery."
  },
  pricing: {
    disposables: [{min: 1, price: 25}, {min: 5, price: 20}, {min: 10, price: 15}, {min: 20, price: 12}],
    shrooms: [{min: 1, price: 30}, {min: 5, price: 24}, {min: 10, price: 18}, {min: 20, price: 14}]
  },
  banner: {on: true, text: "Contact us: {phone}"},
  hero: {line1: "Fresh out", line2: "the", accent: "oven.", lead: "Flower, disposables, alcohol and shrooms, all in one cozy little bakery."},
  seo: {
    siteName: "Blinks Bakery",
    homeTitle: "Blinks Bakery | Fresh out the oven",
    homeDesc: "Blinks Bakery: flower, disposables, alcohol and shrooms. Pick, send your order, we handle the rest.",
    shopDesc: "Browse the Blinks Bakery menu."
  },
  maintenance: {on: false, title: "Back soon", text: "We are updating the menu. Please check back in a little while."}
};
