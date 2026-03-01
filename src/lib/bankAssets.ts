export type BankAsset = {
  logo: string;
  color: string;
};

export const BANK_ASSETS: Record<string, BankAsset> = {
  nubank: { logo: "/banks/nubank.svg", color: "#820AD1" },
  itau: { logo: "/banks/itau.svg", color: "#FF7A00" },
  bradesco: { logo: "/banks/bradesco.svg", color: "#CC092F" },
  santander: { logo: "/banks/santander.svg", color: "#EC0000" },
  bb: { logo: "/banks/bb.svg", color: "#0033A0" },
  caixa: { logo: "/banks/caixa.svg", color: "#0066B3" },
  inter: { logo: "/banks/inter.svg", color: "#FF7A00" },
  c6: { logo: "/banks/c6.svg", color: "#111111" },
  btg: { logo: "/banks/btg.svg", color: "#1E4F8A" },
  sicredi: { logo: "/banks/sicredi.svg", color: "#3AAA35" },
  sicoob: { logo: "/banks/sicoob.svg", color: "#003641" },
  neon: { logo: "/banks/neon.svg", color: "#00D4FF" },
  pagbank: { logo: "/banks/pagbank.svg", color: "#00A650" },
  mercadopago: { logo: "/banks/mercadopago.svg", color: "#009EE3" },
  picpay: { logo: "/banks/picpay.svg", color: "#21C25E" },
};

const SLUG_ALIASES: Record<string, string[]> = {
  nubank: ["nubank", "nu pagamentos", "nu bank", "nu"],
  itau: ["itau", "itau unibanco", "unibanco"],
  bradesco: ["bradesco"],
  santander: ["santander"],
  bb: ["banco do brasil", "bco do brasil", "bb"],
  caixa: ["caixa", "caixa economica", "caixa economica federal"],
  inter: ["inter", "banco inter"],
  c6: ["c6", "c6 bank", "banco c6"],
  btg: ["btg", "btg pactual"],
  sicredi: ["sicredi"],
  sicoob: ["sicoob"],
  neon: ["neon"],
  pagbank: ["pagbank", "pagseguro"],
  mercadopago: ["mercado pago", "mercadopago"],
  picpay: ["picpay", "pic pay"],
};

const CODE_TO_SLUG: Record<string, string> = {
  "1": "bb",
  "33": "santander",
  "77": "inter",
  "104": "caixa",
  "208": "btg",
  "237": "bradesco",
  "260": "nubank",
  "336": "c6",
  "341": "itau",
  "748": "sicredi",
  "756": "sicoob",
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getBankInitials = (bankName: string) => {
  const words = (bankName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "BK";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

export const generateBankColor = (seed: string) => {
  const text = normalize(seed) || "bank";
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 65% 45%)`;
};

export const resolveBankSlug = (bankName: string, bankCode?: string) => {
  const code = (bankCode || "").trim();
  if (code && CODE_TO_SLUG[code]) return CODE_TO_SLUG[code];

  const normalizedName = normalize(bankName);
  if (!normalizedName) return null;

  for (const [slug, aliases] of Object.entries(SLUG_ALIASES)) {
    if (aliases.some((alias) => normalizedName.includes(normalize(alias)))) {
      return slug;
    }
  }
  return null;
};

export const getBankAssetBySlug = (slug: string | null | undefined) => {
  if (!slug) return null;
  return BANK_ASSETS[slug] || null;
};
