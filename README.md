# Redact before you paste

A web page that takes client details out of text before you paste it into ChatGPT, Copilot or any other AI tool, then puts them back into the AI's answer.

It's built for people in small professional offices, such as bookkeepers, accountants and lawyers, who want help from AI with an email or a file note but shouldn't hand over a client's tax file number to do it.

Everything runs in the browser. There is no server, no account and no network traffic after the page loads.

## How it works

1. **Paste your text.** Names, phone numbers, emails, TFNs, ABNs and other details are swapped for placeholders like `[PERSON 1]` and `[TFN 1]` as you type.
2. **Copy the safe version** into your AI tool. The same detail always gets the same placeholder, so the AI can still follow who is who.
3. **Paste the AI's answer back.** The placeholders are swapped back for the real details, on your computer.

## What it looks for

| Detail | How it's recognised |
|---|---|
| Tax file number | 9 digits that pass the TFN check-digit rule |
| ABN | 11 digits that pass the ABN check-digit rule |
| ACN | 9 digits that pass the ACN check-digit rule |
| Medicare number | 10 or 11 digits, starting 2 to 6, that pass the Medicare check digit |
| Card number | 13 to 19 digits that pass the Luhn check |
| Phone | Australian mobile, landline, 1300 and 1800 formats, and `+61`. An 8-digit local number only counts after a word like "phone" or "mob" |
| Email | Standard email address format |
| BSB and account number | Only after the words "BSB" or "account" |
| Date of birth | Only after "DOB", "date of birth" or "born" |
| Street address | Number, street name and street type, plus suburb, state and postcode when present |
| Names | After a title (Mr, Ms, Dr), a greeting (Dear, Hi), a label (Client:, From:) or on the line after a sign-off. Once a name is found, its other appearances and its parts are redacted too |
| Your own list | Any word or phrase you add, such as client or company names |

Check digits matter. Without them, any 9-digit invoice number would be treated as a TFN.

## Privacy

- The page sets a Content Security Policy of `default-src 'none'`. Once loaded, it can't make network requests: no fetch, no images from other sites, no form posts. You can see the browser refuse them in the developer console.
- Nothing is saved. The list of what was replaced lives in the page's memory and disappears when the tab closes.
- All page content is built with `textContent`, never `innerHTML`, so pasted text can't add markup or scripts to the page.

## Limits

- **Names without a clue are missed.** "Jane Citizen called" isn't caught unless Jane appears somewhere with a title, greeting, label or sign-off. Add names like that to the list.
- It's tuned for Australian formats.
- Browser extensions that can read every site can read this page too.
- It lowers the risk of sharing client details. It doesn't remove it. Read the safe version before you paste it.

## Run it

The page uses JavaScript modules, which browsers won't load from a `file://` address, so serve the `web` folder with any static web server:

```
py -m http.server 8091 --bind 127.0.0.1 --directory web
```

Then open http://127.0.0.1:8091.

## Tests

Needs Node.js 22 or later. No packages to install.

```
npm test
```

There are 28 tests covering the check-digit rules, each kind of detail, things that must **not** be redacted (amounts, years, times, version numbers, "Hi team"), placeholders staying consistent, and putting details back.

## Files

| File | What it does |
|---|---|
| `web/checksums.js` | Check-digit rules for TFN, ABN, ACN, Medicare and card numbers |
| `web/detect.js` | Finds details in text and decides what each number is |
| `web/redact.js` | Swaps findings for placeholders and swaps them back |
| `web/app.js` | Connects the page to the code above |
| `web/sample.js` | The made-up example email |
| `tests/` | Tests, run with Node's built-in test runner |

The example uses phone numbers from ranges the ACMA reserves for fiction, `example.com` email addresses, and published test values for the ID numbers.
