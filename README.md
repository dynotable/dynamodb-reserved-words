# dynamodb-reserved-words

The complete list of 573 DynamoDB reserved words, as data, with helpers to check attribute names and generate the `ExpressionAttributeNames` aliases that unblock them. Zero dependencies.

DynamoDB reserves 573 words (`name`, `status`, `date`, `year`, `count`, and 568 more) that you can't use directly as attribute names in expressions. Hit one and the request fails with a `ValidationException` ("Attribute name is a reserved keyword; reserved keyword: status"). The fix is always the same: alias the name with a `#`-prefixed placeholder and map it in `ExpressionAttributeNames`. This package is that list and that fix.

The list is verbatim from the AWS [Reserved words in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html) reference (captured 2026-07-13, re-verified byte-identical 2026-08-15) and the count is pinned by tests, twice: the deduplicated set size and the raw token count, so a duplicate or a drift from the AWS page fails the build.

## Install

```sh
npm install dynamodb-reserved-words
```

ESM and CJS, browser-safe.

## Thirty seconds

```ts
import {checkNames, expressionAttributeNames} from 'dynamodb-reserved-words';

const checks = checkNames(['userId', 'status', 'name']);
// [
//   {name: 'userId', reserved: false, alias: '#userId'},
//   {name: 'status', reserved: true,  alias: '#status'},
//   {name: 'name',   reserved: true,  alias: '#name'}
// ]

expressionAttributeNames(checks);
// {'#status': 'status', '#name': 'name'}   ← paste into your query params
```

```ts
import {isReserved} from 'dynamodb-reserved-words';

isReserved('status'); // true (case-insensitive)
isReserved('userId'); // false
```

## API

| Export | What it does |
| --- | --- |
| `isReserved(word)` | Case-insensitive membership check against the 573-word list. |
| `checkNames(names)` | Check a list of attribute names. Each result carries a unique, collision-safe `#` alias. Blanks dropped, duplicates de-duplicated, order preserved. |
| `expressionAttributeNames(checks)` | The `ExpressionAttributeNames` map for the reserved names in a `checkNames` result. Empty object when nothing is reserved. |
| `splitNames(input)` | Split a pasted blob (newlines, commas, spaces, semicolons) into names. |
| `RESERVED_WORDS` | The list as a `ReadonlySet<string>`, upper-cased. |
| `RESERVED_WORDS_RAW` | The verbatim captured block, for auditing against the AWS page. |
| `reservedWordsByLetter()` | The list grouped by initial letter, for rendering a reference. |

Alias generation handles the awkward cases: non-word characters collapse to `_`, colliding aliases get numeric suffixes, a name that cleans to nothing falls back to `#attr`. The output is always a valid `ExpressionAttributeNames` key.

## Check names without installing anything

The same checker runs in the browser at [dynotable.com/tools/dynamodb-reserved-words-checker](https://dynotable.com/tools/dynamodb-reserved-words-checker), with the full browsable list.

## License

MIT © [DynoTable](https://dynotable.com)
