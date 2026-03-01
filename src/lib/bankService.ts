export type BrasilApiBank = {
  ispb: string | null;
  name: string;
  code: number | null;
  fullName: string | null;
};

export type BankOption = {
  name: string;
  fullName: string;
  code: string;
  ispb: string;
};

const BANKS_CACHE_KEY = "mordomo:banks:v1";
const BANKS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BANKS_API_URL = "https://brasilapi.com.br/api/banks/v1";
const BANKS_FETCH_TIMEOUT_MS = 8000;

const FALLBACK_BANKS: BankOption[] = [
  { name: "Nubank", fullName: "Nubank", code: "260", ispb: "18236120" },
  { name: "Banco do Brasil", fullName: "Banco do Brasil S.A.", code: "1", ispb: "00000000" },
  { name: "Caixa", fullName: "Caixa Economica Federal", code: "104", ispb: "00360305" },
  { name: "Bradesco", fullName: "Banco Bradesco S.A.", code: "237", ispb: "60746948" },
  { name: "Itau", fullName: "Itau Unibanco S.A.", code: "341", ispb: "60701190" },
  { name: "Santander", fullName: "Banco Santander (Brasil) S.A.", code: "33", ispb: "90400888" },
  { name: "Inter", fullName: "Banco Inter S.A.", code: "77", ispb: "00416968" },
  { name: "C6 Bank", fullName: "Banco C6 S.A.", code: "336", ispb: "31872495" },
  { name: "BTG Pactual", fullName: "Banco BTG Pactual S.A.", code: "208", ispb: "30306294" },
];

type BanksCache = {
  savedAt: number;
  data: BankOption[];
};

const isValidCache = (cache: BanksCache | null) =>
  Boolean(cache && Array.isArray(cache.data) && Date.now() - cache.savedAt < BANKS_CACHE_TTL_MS);

const toBankOption = (bank: BrasilApiBank): BankOption => ({
  name: bank.name?.trim() || "",
  fullName: bank.fullName?.trim() || bank.name?.trim() || "",
  code: bank.code != null ? String(bank.code) : "",
  ispb: bank.ispb?.trim() || "",
});

const normalizeBanks = (banks: BrasilApiBank[]) =>
  banks
    .map(toBankOption)
    .filter((bank) => bank.fullName)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));

const readCache = (): BanksCache | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BANKS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BanksCache;
  } catch {
    return null;
  }
};

const writeCache = (data: BankOption[]) => {
  if (typeof window === "undefined") return;
  const cache: BanksCache = { savedAt: Date.now(), data };
  window.localStorage.setItem(BANKS_CACHE_KEY, JSON.stringify(cache));
};

export const getBanks = async (): Promise<BankOption[]> => {
  const cache = readCache();
  if (isValidCache(cache)) {
    return cache!.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), BANKS_FETCH_TIMEOUT_MS);
    const response = await fetch(BANKS_API_URL, { signal: controller.signal });
    window.clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erro ao buscar bancos: ${response.status}`);
    }
    const data = (await response.json()) as BrasilApiBank[];
    const normalized = normalizeBanks(data);
    writeCache(normalized);
    return normalized;
  } catch {
    if (cache?.data?.length) {
      return cache.data;
    }
    writeCache(FALLBACK_BANKS);
    return FALLBACK_BANKS;
  }
};
