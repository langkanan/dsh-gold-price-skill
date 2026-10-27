# dsh-gold-price-ticker

Live gold price ticker for the DeepSeek Harness Web UI sidebar.

The card renders above the sidebar account area and shows:

- Shanghai Gold `Au99.99` in **CNY per gram** (native SGE quote, not a USD conversion)
- London spot gold in **USD per troy ounce**
- The move from the international gold open
- A small trend chart with time and price axes
- The current Shanghai session status (`沪金收盘` when SGE is closed)

## Install

```sh
dsh plugin --profile web add dsh-gold-price-ticker
```

Then restart the profile, or install it through the DSH plugin manager.

The plugin appears in the left sidebar below the workspace/session area and above
the settings/account block. Collapse the sidebar to hide the card.

## Data sources

| Data | Source |
| --- | --- |
| London spot USD/oz | `https://api.gold-api.com/price/XAU` |
| Shanghai Gold Au99.99 CNY/gram | `https://hq.sinajs.cn/list=SGE_AU9999` |
| London open / high / low fallback | `https://hq.sinajs.cn/list=hf_XAU` |
| USD/CNY reference | `https://hq.sinajs.cn/list=USDCNY` |

The Sina quote request sends `Referer: https://finance.sina.com.cn` because the
quote endpoint requires it. No API keys or credentials are used.

The USD open comes from the direct `hf_XAU` quote feed. Free quote vendors use
different daily-open conventions; the card does not scrape HTML pages or use a
manual value.

## Privacy and permissions

- The Host fetches public quote endpoints and serves one same-origin JSON route:
  `/plugins/gold-price-ticker/quote`.
- The browser stores up to 24 hours of sampled prices in `localStorage` only for
  the trend chart.
- No account data, session content, or credentials are read or sent.
- Quotes are for information only, not investment advice.

## License

MIT
