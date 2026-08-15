// DynamoDB reserved words — the pure core behind the reserved-words checker tool
// (`/tools/dynamodb-reserved-words-checker`). No React; the widget renders the
// results and copies the generated `ExpressionAttributeNames` map.
//
// Source of truth: the AWS "Reserved words in DynamoDB" reference
// (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html,
// captured 2026-07-13, re-verified byte-identical 2026-08-15). The list is NOT case-sensitive. You cannot use any of
// these words directly as an attribute name in an expression — you must alias it
// with an expression attribute name (a `#`-prefixed placeholder). This module is
// the single source of the list; the expression-builder tool sidesteps the issue
// entirely by aliasing EVERY name, so it does not need the list itself.
//
// Verbatim from the AWS reference so the set is auditable in the diff; the count
// is pinned by a test (reserved-words.test.ts) — both the deduped Set size AND
// this raw token count, so a duplicate slipping into the block fails loud.
export const RESERVED_WORDS_RAW = `
ABORT ABSOLUTE ACTION ADD AFTER AGENT AGGREGATE ALL ALLOCATE ALTER ANALYZE AND ANY
ARCHIVE ARE ARRAY AS ASC ASCII ASENSITIVE ASSERTION ASYMMETRIC AT ATOMIC ATTACH
ATTRIBUTE AUTH AUTHORIZATION AUTHORIZE AUTO AVG BACK BACKUP BASE BATCH BEFORE BEGIN
BETWEEN BIGINT BINARY BIT BLOB BLOCK BOOLEAN BOTH BREADTH BUCKET BULK BY BYTE CALL
CALLED CALLING CAPACITY CASCADE CASCADED CASE CAST CATALOG CHAR CHARACTER CHECK CLASS
CLOB CLOSE CLUSTER CLUSTERED CLUSTERING CLUSTERS COALESCE COLLATE COLLATION COLLECTION
COLUMN COLUMNS COMBINE COMMENT COMMIT COMPACT COMPILE COMPRESS CONDITION CONFLICT
CONNECT CONNECTION CONSISTENCY CONSISTENT CONSTRAINT CONSTRAINTS CONSTRUCTOR CONSUMED
CONTINUE CONVERT COPY CORRESPONDING COUNT COUNTER CREATE CROSS CUBE CURRENT CURSOR
CYCLE DATA DATABASE DATE DATETIME DAY DEALLOCATE DEC DECIMAL DECLARE DEFAULT DEFERRABLE
DEFERRED DEFINE DEFINED DEFINITION DELETE DELIMITED DEPTH DEREF DESC DESCRIBE DESCRIPTOR
DETACH DETERMINISTIC DIAGNOSTICS DIRECTORIES DISABLE DISCONNECT DISTINCT DISTRIBUTE DO
DOMAIN DOUBLE DROP DUMP DURATION DYNAMIC EACH ELEMENT ELSE ELSEIF EMPTY ENABLE END EQUAL
EQUALS ERROR ESCAPE ESCAPED EVAL EVALUATE EXCEEDED EXCEPT EXCEPTION EXCEPTIONS EXCLUSIVE
EXEC EXECUTE EXISTS EXIT EXPLAIN EXPLODE EXPORT EXPRESSION EXTENDED EXTERNAL EXTRACT FAIL
FALSE FAMILY FETCH FIELDS FILE FILTER FILTERING FINAL FINISH FIRST FIXED FLATTERN FLOAT
FOR FORCE FOREIGN FORMAT FORWARD FOUND FREE FROM FULL FUNCTION FUNCTIONS GENERAL GENERATE
GET GLOB GLOBAL GO GOTO GRANT GREATER GROUP GROUPING HANDLER HASH HAVE HAVING HEAP HIDDEN
HOLD HOUR IDENTIFIED IDENTITY IF IGNORE IMMEDIATE IMPORT IN INCLUDING INCLUSIVE INCREMENT
INCREMENTAL INDEX INDEXED INDEXES INDICATOR INFINITE INITIALLY INLINE INNER INNTER INOUT
INPUT INSENSITIVE INSERT INSTEAD INT INTEGER INTERSECT INTERVAL INTO INVALIDATE IS
ISOLATION ITEM ITEMS ITERATE JOIN KEY KEYS LAG LANGUAGE LARGE LAST LATERAL LEAD LEADING
LEAVE LEFT LENGTH LESS LEVEL LIKE LIMIT LIMITED LINES LIST LOAD LOCAL LOCALTIME
LOCALTIMESTAMP LOCATION LOCATOR LOCK LOCKS LOG LOGED LONG LOOP LOWER MAP MATCH MATERIALIZED
MAX MAXLEN MEMBER MERGE METHOD METRICS MIN MINUS MINUTE MISSING MOD MODE MODIFIES MODIFY
MODULE MONTH MULTI MULTISET NAME NAMES NATIONAL NATURAL NCHAR NCLOB NEW NEXT NO NONE NOT
NULL NULLIF NUMBER NUMERIC OBJECT OF OFFLINE OFFSET OLD ON ONLINE ONLY OPAQUE OPEN OPERATOR
OPTION OR ORDER ORDINALITY OTHER OTHERS OUT OUTER OUTPUT OVER OVERLAPS OVERRIDE OWNER PAD
PARALLEL PARAMETER PARAMETERS PARTIAL PARTITION PARTITIONED PARTITIONS PATH PERCENT
PERCENTILE PERMISSION PERMISSIONS PIPE PIPELINED PLAN POOL POSITION PRECISION PREPARE
PRESERVE PRIMARY PRIOR PRIVATE PRIVILEGES PROCEDURE PROCESSED PROJECT PROJECTION PROPERTY
PROVISIONING PUBLIC PUT QUERY QUIT QUORUM RAISE RANDOM RANGE RANK RAW READ READS REAL
REBUILD RECORD RECURSIVE REDUCE REF REFERENCE REFERENCES REFERENCING REGEXP REGION REINDEX
RELATIVE RELEASE REMAINDER RENAME REPEAT REPLACE REQUEST RESET RESIGNAL RESOURCE RESPONSE
RESTORE RESTRICT RESULT RETURN RETURNING RETURNS REVERSE REVOKE RIGHT ROLE ROLES ROLLBACK
ROLLUP ROUTINE ROW ROWS RULE RULES SAMPLE SATISFIES SAVE SAVEPOINT SCAN SCHEMA SCOPE SCROLL
SEARCH SECOND SECTION SEGMENT SEGMENTS SELECT SELF SEMI SENSITIVE SEPARATE SEQUENCE
SERIALIZABLE SESSION SET SETS SHARD SHARE SHARED SHORT SHOW SIGNAL SIMILAR SIZE SKEWED
SMALLINT SNAPSHOT SOME SOURCE SPACE SPACES SPARSE SPECIFIC SPECIFICTYPE SPLIT SQL SQLCODE
SQLERROR SQLEXCEPTION SQLSTATE SQLWARNING START STATE STATIC STATUS STORAGE STORE STORED
STREAM STRING STRUCT STYLE SUB SUBMULTISET SUBPARTITION SUBSTRING SUBTYPE SUM SUPER
SYMMETRIC SYNONYM SYSTEM TABLE TABLESAMPLE TEMP TEMPORARY TERMINATED TEXT THAN THEN
THROUGHPUT TIME TIMESTAMP TIMEZONE TINYINT TO TOKEN TOTAL TOUCH TRAILING TRANSACTION
TRANSFORM TRANSLATE TRANSLATION TREAT TRIGGER TRIM TRUE TRUNCATE TTL TUPLE TYPE UNDER UNDO
UNION UNIQUE UNIT UNKNOWN UNLOGGED UNNEST UNPROCESSED UNSIGNED UNTIL UPDATE UPPER URL USAGE
USE USER USERS USING UUID VACUUM VALUE VALUED VALUES VARCHAR VARIABLE VARIANCE VARINT
VARYING VIEW VIEWS VIRTUAL VOID WAIT WHEN WHENEVER WHERE WHILE WINDOW WITH WITHIN WITHOUT
WORK WRAPPED WRITE YEAR ZONE
`;

/** Every DynamoDB reserved word, upper-cased. Case-insensitive membership set. */
export const RESERVED_WORDS: ReadonlySet<string> = new Set(RESERVED_WORDS_RAW.trim().split(/\s+/));

/** Whether a bare attribute name is a DynamoDB reserved word (case-insensitive). */
export function isReserved(word: string): boolean {
  return RESERVED_WORDS.has(word.trim().toUpperCase());
}

export interface ReservedCheck {
  /** The attribute name as entered (trimmed). */
  name: string;
  /** Whether it collides with a reserved word. */
  reserved: boolean;
  /** A safe `#`-prefixed expression-attribute-name placeholder for the name. */
  alias: string;
}

// Build a `#`-prefixed placeholder that is a valid ExpressionAttributeNames key
// (`#` + word chars). Non-word characters collapse to `_`, and leading/trailing
// underscores are trimmed; a name that cleans to nothing falls back to `#attr`.
// A leading digit is left as-is (`#123` is a valid placeholder). Uniqueness is
// enforced by the caller.
function baseAlias(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
  return `#${cleaned || 'attr'}`;
}

/**
 * Check a list of attribute names against the reserved list. Each result carries
 * a unique `#`-aliased placeholder (colliding aliases get a numeric suffix), so
 * the widget can render a ready-to-paste `ExpressionAttributeNames` map. Blank
 * entries are dropped; order is preserved and duplicates are de-duped by name.
 */
export function checkNames(rawNames: readonly string[]): ReservedCheck[] {
  const seen = new Set<string>();
  const usedAliases = new Set<string>();
  const out: ReservedCheck[] = [];
  for (const raw of rawNames) {
    const name = raw.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    let alias = baseAlias(name);
    if (usedAliases.has(alias)) {
      let n = 2;
      while (usedAliases.has(`${alias}_${n}`)) n++;
      alias = `${alias}_${n}`;
    }
    usedAliases.add(alias);
    out.push({name, reserved: isReserved(name), alias});
  }
  return out;
}

/**
 * Split a free-text blob of attribute names into individual names. Accepts
 * newline-, comma-, space-, or semicolon-separated input (whatever a developer
 * pastes from a schema).
 */
export function splitNames(input: string): string[] {
  return input
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The `ExpressionAttributeNames` map for the RESERVED names in the checked list
 * (`{ '#name': 'Name' }`). Only reserved names need aliasing, so non-reserved
 * names are omitted; returns an empty object when nothing is reserved.
 */
export function expressionAttributeNames(checks: readonly ReservedCheck[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of checks) {
    if (c.reserved) map[c.alias] = c.name;
  }
  return map;
}

/** One initial letter and the reserved words starting with it, in order. */
export interface ReservedWordGroup {
  letter: string;
  words: ReadonlyArray<string>;
}

/**
 * The full reserved list grouped by initial letter, for PUBLISHING the reference
 * on the tool page.
 *
 * Why this exists: measured 2026-08-03, `/tools/dynamodb-reserved-words-checker`
 * server-rendered 592 words of visible text and the list itself never reached the
 * HTML at all — not one of the 573 words. The page owned the single most useful
 * artifact on the topic (the complete AWS list, verbatim and auditable) and
 * published none of it, leaving only an input box that needs JS to say anything.
 * Grouping by letter is what makes 573 tokens a reference a human can scan rather
 * than an undifferentiated wall.
 *
 * Derived from `RESERVED_WORDS_RAW`, so the published page and the checker can
 * never disagree about what is reserved.
 */
export function reservedWordsByLetter(): ReadonlyArray<ReservedWordGroup> {
  const groups = new Map<string, Array<string>>();
  for (const word of [...RESERVED_WORDS].sort()) {
    const letter = word[0];
    const bucket = groups.get(letter);
    if (bucket) bucket.push(word);
    else groups.set(letter, [word]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, words]) => ({letter, words}));
}
