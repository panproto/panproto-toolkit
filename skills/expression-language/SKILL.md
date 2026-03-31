---
name: expression-language
description: >
  Reference guide for panproto's expression language. Covers literals, variables, field
  access, ~50 builtins, lambda functions, pattern matching, list comprehensions, and
  step/depth limits.
---

# Expression Language Reference

You are providing a reference for panproto's built-in expression language. It is a pure functional lambda calculus used in field transforms, queries, coercions, defaults, and conflict resolution.

## Syntax overview

The expression language uses Haskell-style syntax with layout sensitivity:

```haskell
-- This is a comment

-- Lambda
\x -> x + 1

-- Application
f x y           -- f(x, y)
(\x -> x + 1) 5  -- 6

-- Let/where
let x = 5 in x + 1
f x where f = \y -> y * 2

-- Conditionals
if x > 0 then "positive" else "non-positive"

-- Pattern matching
case value of
  0 -> "zero"
  n | n > 0 -> "positive"
  _ -> "negative"
```

## Literals

| Type | Examples |
|------|---------|
| Integer | `42`, `-1`, `0` |
| Float | `3.14`, `-0.5`, `1.0e10` |
| String | `"hello"`, `"line1\nline2"` |
| Boolean | `true`, `false` |
| Null | `null` |
| List | `[1, 2, 3]`, `[]` |
| Record | `{ name: "Alice", age: 30 }` |

## Operators

| Precedence | Operator | Meaning |
|-----------|----------|---------|
| 7 | `*`, `/`, `%` | Multiply, divide, modulo |
| 6 | `+`, `-` | Add, subtract |
| 5 | `++` | String/list concatenation |
| 4 | `==`, `/=`, `<`, `>`, `<=`, `>=` | Comparison |
| 3 | `&&` | Logical and |
| 2 | `\|\|` | Logical or |
| 1 | `$` | Low-precedence application |
| 0 | `.` | Function composition |

## Field access

```haskell
record.name              -- access field "name"
record.address.city      -- nested access
record.tags[0]           -- list indexing
```

## Record operations

```haskell
-- Construction
{ name: "Alice", age: 30 }

-- Spread (update)
{ ...record, name: "Bob" }

-- Field punning
let name = "Alice" in { name }   -- same as { name: name }

-- Projection
record { name, age }             -- keep only these fields
```

## Builtins (~50)

### Arithmetic
| Builtin | Signature | Example |
|---------|-----------|---------|
| `abs` | `Number -> Number` | `abs (-5)` = `5` |
| `min` | `Number -> Number -> Number` | `min 3 5` = `3` |
| `max` | `Number -> Number -> Number` | `max 3 5` = `5` |
| `floor` | `Float -> Integer` | `floor 3.7` = `3` |
| `ceil` | `Float -> Integer` | `ceil 3.2` = `4` |
| `round` | `Float -> Integer` | `round 3.5` = `4` |

### String
| Builtin | Signature | Example |
|---------|-----------|---------|
| `toUpper` | `String -> String` | `toUpper "hi"` = `"HI"` |
| `toLower` | `String -> String` | `toLower "HI"` = `"hi"` |
| `trim` | `String -> String` | `trim "  hi  "` = `"hi"` |
| `length` | `String -> Integer` | `length "hello"` = `5` |
| `split` | `String -> String -> [String]` | `split "," "a,b"` = `["a","b"]` |
| `join` | `String -> [String] -> String` | `join ", " ["a","b"]` = `"a, b"` |
| `replace` | `String -> String -> String -> String` | `replace "o" "0" "foo"` = `"f00"` |
| `startsWith` | `String -> String -> Bool` | `startsWith "he" "hello"` = `true` |
| `endsWith` | `String -> String -> Bool` | `endsWith "lo" "hello"` = `true` |
| `contains` | `String -> String -> Bool` | `contains "ell" "hello"` = `true` |
| `substring` | `Int -> Int -> String -> String` | `substring 1 3 "hello"` = `"el"` |
| `parseInt` | `String -> Integer` | `parseInt "42"` = `42` |
| `parseFloat` | `String -> Float` | `parseFloat "3.14"` = `3.14` |
| `toString` | `a -> String` | `toString 42` = `"42"` |
| `regex` | `String -> String -> Bool` | `regex "^[a-z]+$" "hello"` = `true` |

### List
| Builtin | Signature | Example |
|---------|-----------|---------|
| `map` | `(a -> b) -> [a] -> [b]` | `map (\x -> x*2) [1,2,3]` = `[2,4,6]` |
| `filter` | `(a -> Bool) -> [a] -> [a]` | `filter (\x -> x>1) [1,2,3]` = `[2,3]` |
| `foldl` | `(b -> a -> b) -> b -> [a] -> b` | `foldl (+) 0 [1,2,3]` = `6` |
| `foldr` | `(a -> b -> b) -> b -> [a] -> b` | `foldr (++) "" ["a","b"]` = `"ab"` |
| `head` | `[a] -> a` | `head [1,2,3]` = `1` |
| `tail` | `[a] -> [a]` | `tail [1,2,3]` = `[2,3]` |
| `init` | `[a] -> [a]` | `init [1,2,3]` = `[1,2]` |
| `last` | `[a] -> a` | `last [1,2,3]` = `3` |
| `take` | `Int -> [a] -> [a]` | `take 2 [1,2,3]` = `[1,2]` |
| `drop` | `Int -> [a] -> [a]` | `drop 1 [1,2,3]` = `[2,3]` |
| `reverse` | `[a] -> [a]` | `reverse [1,2,3]` = `[3,2,1]` |
| `sort` | `[a] -> [a]` | `sort [3,1,2]` = `[1,2,3]` |
| `unique` | `[a] -> [a]` | `unique [1,2,2,3]` = `[1,2,3]` |
| `flatten` | `[[a]] -> [a]` | `flatten [[1],[2,3]]` = `[1,2,3]` |
| `zip` | `[a] -> [b] -> [(a,b)]` | `zip [1,2] ["a","b"]` |
| `enumerate` | `[a] -> [(Int,a)]` | `enumerate ["a","b"]` |
| `any` | `(a -> Bool) -> [a] -> Bool` | `any (>2) [1,2,3]` = `true` |
| `all` | `(a -> Bool) -> [a] -> Bool` | `all (>0) [1,2,3]` = `true` |
| `elem` | `a -> [a] -> Bool` | `elem 2 [1,2,3]` = `true` |
| `lookup` | `k -> [(k,v)] -> Maybe v` | `lookup "x" [("x",1)]` = `1` |

### Record
| Builtin | Signature | Example |
|---------|-----------|---------|
| `keys` | `Record -> [String]` | `keys {a:1, b:2}` = `["a","b"]` |
| `values` | `Record -> [a]` | `values {a:1, b:2}` = `[1,2]` |
| `hasField` | `String -> Record -> Bool` | `hasField "a" {a:1}` = `true` |
| `getField` | `String -> Record -> a` | `getField "a" {a:1}` = `1` |
| `setField` | `String -> a -> Record -> Record` | `setField "a" 2 {a:1}` = `{a:2}` |
| `removeField` | `String -> Record -> Record` | `removeField "a" {a:1,b:2}` = `{b:2}` |
| `mergeRecords` | `Record -> Record -> Record` | `mergeRecords {a:1} {b:2}` = `{a:1,b:2}` |

### Type conversion
| Builtin | Signature | Example |
|---------|-----------|---------|
| `toInt` | `a -> Integer` | `toInt "42"` = `42`, `toInt 3.7` = `3` |
| `toFloat` | `a -> Float` | `toFloat 42` = `42.0` |
| `toBool` | `a -> Bool` | `toBool 0` = `false`, `toBool ""` = `false` |
| `typeOf` | `a -> String` | `typeOf 42` = `"integer"` |

## Pattern matching

```haskell
case value of
  0 -> "zero"
  n | n > 0 -> "positive"    -- guard
  n | n < 0 -> "negative"
  _ -> "unknown"              -- wildcard

-- On records
case record of
  { status: "active" } -> processActive record
  { status: "deleted" } -> null
  _ -> processDefault record

-- On lists
case xs of
  [] -> "empty"
  [x] -> "singleton: " ++ toString x
  (x:rest) -> "head: " ++ toString x
```

## Evaluation limits

Expressions run with safety limits to prevent infinite loops:
- **Step limit**: maximum number of reduction steps (default: 10,000)
- **Depth limit**: maximum call stack depth (default: 100)

Exceeding either limit produces an error, not an infinite hang.

## Using in the CLI

```bash
# Evaluate an expression
schema expr eval "2 + 3 * 4"

# Parse and pretty-print
schema expr parse "\x -> x + 1"

# Interactive REPL
schema expr repl
```

## Further Reading

- [Tutorial Ch. 20: Value-Dependent Transforms](https://panproto.dev/tutorial/chapters/20-value-dependent-transforms.html)
- [Tutorial Ch. 21: Querying Instances](https://panproto.dev/tutorial/chapters/21-querying-instances.html)
