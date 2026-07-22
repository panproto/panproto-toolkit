---
name: expression-language
description: >
  Reference guide for panproto's expression language. Covers literals, variables, field
  access, 60 builtins (arithmetic, rounding, comparison, boolean, string, list, record,
  utility, type coercion, type inspection, graph traversal), lambda functions, pattern
  matching, list comprehensions, and step/depth limits.
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
f x y            -- f applied to x then y
(\x -> x + 1) 5  -- 6

-- Let/where
let x = 5 in x + 1
f x where f = \y -> y * 2

-- Conditionals
if x > 0 then "positive" else "non-positive"

-- Pattern matching
case value of
  0 -> "zero"
  1 -> "one"
  _ -> "other"
```

Note the literal keywords: booleans are `True` and `False`, and the null value is `Nothing`.

## Literals

| Type | Examples |
|------|---------|
| Integer | `42`, `-1`, `0`, `0xff` |
| Float | `3.14`, `1.5`, `1.0` |
| String | `"hello"`, `"line1\nline2"` |
| Boolean | `True`, `False` |
| Null | `Nothing` |
| List | `[1, 2, 3]`, `[]` |
| Record | `{ name = "Alice", age = 30 }` |

## Operators

Precedence rises with the number (higher binds tighter). Comparison is
right-associative; the arithmetic and logical operators are left-associative.

| Precedence | Operator | Meaning |
|-----------|----------|---------|
| 9 | `-x`, `not x` | Unary negation, logical not (prefix) |
| 8 | `*`, `/`, `%`, `div`, `mod` | Multiply, divide, modulo (`div`/`mod` are keyword spellings of `/`/`%`) |
| 7 | `+`, `-` | Add, subtract |
| 6 | `++` | String concatenation |
| 5 | `==`, `/=`, `<`, `>`, `<=`, `>=` | Comparison (note `/=` for not-equal) |
| 4 | `&&` | Logical and |
| 3 | `\|\|` | Logical or |
| 1 | `&` | Pipe: `x & f` applies `f` to `x` |

## Field access

```haskell
record.name              -- access field "name"
record.address.city      -- nested access
```

There is no bracket-indexing postfix; to reach a list element use `head`, `tail`, or `fold`.

## Edge traversal

Inside an instance context, `->` follows a named edge from a node (it lowers to the `edge` builtin):

```haskell
doc -> layers            -- follow the "layers" edge from doc
```

## Record operations

```haskell
-- Construction (fields bind with =)
{ name = "Alice", age = 30 }

-- Field punning
let name = "Alice" in { name }   -- same as { name = name }

-- Merge two records (right side wins on key collision)
merge { a = 1 } { b = 2 }        -- { a = 1, b = 2 }
```

## Builtins (60)

The 60 built-in operations live in `panproto_expr::BuiltinOp`. Names below are the surface spellings the parser accepts; where a builtin has both a `snake_case` and a `camelCase` spelling, both are listed. Higher-order list builtins name the function first in surface syntax (`map f xs`, `fold f z xs`).

### Arithmetic (7)
Add, subtract, multiply, divide, and modulo are normally written with operators (`+ - * / %`), with `div`/`mod` as keyword spellings of `/`/`%`. `add`, `sub`, and `mul` are also callable by name.

| Builtin | Signature | Example |
|---------|-----------|---------|
| `add` / `+` | `int\|float -> int\|float -> int\|float` | `2 + 3` = `5` |
| `sub` / `-` | `int\|float -> int\|float -> int\|float` | `5 - 2` = `3` |
| `mul` / `*` | `int\|float -> int\|float -> int\|float` | `3 * 4` = `12` |
| `/` / `div` | `int\|float -> int\|float -> int\|float` | `7 / 2` = `3` (truncating for ints) |
| `%` / `mod` | `int -> int -> int` | `7 % 3` = `1` |
| `-` (prefix) | `int\|float -> int\|float` | `-x` |
| `abs` | `int\|float -> int\|float` | `abs (-5)` = `5` |

### Rounding (3)
| Builtin | Signature | Example |
|---------|-----------|---------|
| `floor` | `float -> int` | `floor 3.7` = `3` |
| `ceil` | `float -> int` | `ceil 3.2` = `4` |
| `round` | `float -> int` | `round 3.5` = `4` (ties to even) |

### Comparison (6)
Written as operators; both operands may be any comparable type, result is `Bool`.

| Operator | Meaning | Example |
|----------|---------|---------|
| `==` | equal | `1 == 1` = `True` |
| `/=` | not equal | `1 /= 2` = `True` |
| `<` | less than | `1 < 2` = `True` |
| `<=` | less than or equal | `2 <= 2` = `True` |
| `>` | greater than | `3 > 2` = `True` |
| `>=` | greater than or equal | `3 >= 3` = `True` |

### Boolean (3)
| Operator | Meaning | Example |
|----------|---------|---------|
| `&&` | logical and | `True && False` = `False` |
| `\|\|` | logical or | `True \|\| False` = `True` |
| `not` | logical not | `not True` = `False` |

### String (10)
| Builtin | Signature | Example |
|---------|-----------|---------|
| `concat` / `++` | `string -> string -> string` | `"a" ++ "b"` = `"ab"` |
| `len` | `string -> int` (byte length) | `len "hello"` = `5` |
| `slice` | `string -> int -> int -> string` | `slice "hello" 1 3` = `"el"` |
| `upper` | `string -> string` | `upper "hi"` = `"HI"` |
| `lower` | `string -> string` | `lower "HI"` = `"hi"` |
| `trim` | `string -> string` | `trim "  hi  "` = `"hi"` |
| `split` | `string -> string -> [string]` | `split "a,b" ","` = `["a","b"]` |
| `join` | `[string] -> string -> string` | `join ["a","b"] ", "` = `"a, b"` |
| `replace` | `string -> string -> string -> string` | `replace "foo" "o" "0"` = `"f00"` |
| `contains` | `string -> string -> bool` **or** `[a] -> a -> bool` | `contains "hello" "ell"` = `True`; `contains [1,2,3] 2` = `True` |

`contains` is overloaded on its first argument: substring containment when given a string, exact element membership when given a list.

### List (10)
| Builtin | Signature | Example |
|---------|-----------|---------|
| `map` | `(a -> b) -> [a] -> [b]` | `map (\x -> x * 2) [1,2,3]` = `[2,4,6]` |
| `filter` | `(a -> bool) -> [a] -> [a]` | `filter (\x -> x > 1) [1,2,3]` = `[2,3]` |
| `fold` | `(b -> a -> b) -> b -> [a] -> b` | `fold (\a -> \b -> a + b) 0 [1,2,3]` = `6` |
| `append` | `[a] -> a -> [a]` | `append [1,2] 3` = `[1,2,3]` |
| `head` | `[a] -> a` | `head [1,2,3]` = `1` |
| `tail` | `[a] -> [a]` | `tail [1,2,3]` = `[2,3]` |
| `reverse` | `[a] -> [a]` | `reverse [1,2,3]` = `[3,2,1]` |
| `flat_map` / `flatMap` | `(a -> [b]) -> [a] -> [b]` | `flat_map (\x -> [x, x]) [1,2]` = `[1,1,2,2]` |
| `length` | `[a] -> int` | `length [1,2,3]` = `3` |
| `range` | `int -> int -> [int]` | `range 1 5` = `[1,2,3,4,5]` |

`range start stop` includes both bounds and yields `[]` when `stop < start`. The surface syntax `[a..b]` lowers to it (`[1..5]` = `[1,2,3,4,5]`); its length is checked against the list budget before allocating. An open-ended `[a..]` is not supported (there are no lazy lists).

There is exactly one fold: `fold f z xs`, a left fold. `map`, `filter`, `fold`, and `flat_map` name the function first in surface syntax.

### Record (4)
| Builtin | Signature | Example |
|---------|-----------|---------|
| `merge` / `merge_records` | `record -> record -> record` | `merge { a = 1 } { b = 2 }` = `{ a = 1, b = 2 }` |
| `keys` | `record -> [string]` | `keys { a = 1, b = 2 }` = `["a","b"]` |
| `values` | `record -> [a]` | `values { a = 1, b = 2 }` = `[1,2]` |
| `has_field` / `hasField` | `record -> string -> bool` | `has_field { a = 1 } "a"` = `True` |

On a key collision, `merge` takes the right-hand record's value.

### Utility (3)
| Builtin | Signature | Example |
|---------|-----------|---------|
| `default` / `default_val` | `a -> a -> a` (fallback when first is `Nothing`) | `default Nothing 0` = `0`; `default 5 0` = `5` |
| `clamp` | `number -> number -> number -> number` (value, min, max) | `clamp 15 0 10` = `10` |
| `truncate_str` / `truncateStr` | `string -> int -> string` (max bytes, char-boundary safe) | `truncate_str "hello" 3` = `"hel"` |

### Type coercion (6)
| Builtin | Signature | Example |
|---------|-----------|---------|
| `int_to_float` / `intToFloat` | `int -> float` | `int_to_float 42` = `42.0` |
| `float_to_int` / `floatToInt` | `float -> int` (truncates) | `float_to_int 3.7` = `3` |
| `int_to_str` / `intToStr` | `int -> string` | `int_to_str 42` = `"42"` |
| `float_to_str` / `floatToStr` | `float -> string` | `float_to_str 3.14` = `"3.14"` |
| `str_to_int` / `strToInt` | `string -> int` (fails on non-numeric) | `str_to_int "42"` = `42` |
| `str_to_float` / `strToFloat` | `string -> float` (fails on non-numeric) | `str_to_float "3.14"` = `3.14` |

### Type inspection (3)
| Builtin | Signature | Example |
|---------|-----------|---------|
| `type_of` / `typeOf` | `a -> string` | `type_of 42` = `"int"` (also `"float"`, `"string"`, `"bool"`, `"list"`, `"record"`, `"null"`, `"function"`) |
| `is_null` / `isNull` | `a -> bool` | `is_null Nothing` = `True` |
| `is_list` / `isList` | `a -> bool` | `is_list [1,2]` = `True` |

### Graph traversal (5)
These require an instance context and are evaluated by the instance-aware evaluator (`panproto_inst::instance_env`). In the standard evaluator they return `Nothing`.

| Builtin | Signature | Meaning |
|---------|-----------|---------|
| `edge` (also `x -> name`) | `node -> string -> value` | Follow a named edge from a node |
| `children` | `node -> [value]` | All children of a node |
| `has_edge` / `hasEdge` | `node -> string -> bool` | Whether a node has a given outgoing edge |
| `edge_count` / `edgeCount` | `node -> int` | Count of outgoing edges |
| `anchor` | `node -> string` | The schema anchor (sort/kind) of a node |

## Pattern matching

`case` arms match literal, variable, wildcard, list, record, and constructor patterns. There are no guards on arms; use `if`/`then`/`else` for conditional logic.

```haskell
case value of
  0 -> "zero"
  1 -> "one"
  _ -> "other"              -- wildcard

-- On records (fields bind with =)
case record of
  { status = "active" } -> processActive record
  { status = "deleted" } -> Nothing
  _ -> processDefault record

-- On lists
case xs of
  [] -> "empty"
  [x] -> "singleton: " ++ int_to_str x
```

## List comprehensions

```haskell
[ x + 1 | x <- xs ]                  -- map
[ x | x <- xs, x > 0 ]               -- map with a guard (filter)
```

Comprehensions desugar to `flat_map` and guards.

## Evaluation limits

Expressions run with safety limits to prevent runaway evaluation:
- **Step limit**: maximum number of reduction steps (`EvalConfig::max_steps`, default 100,000)
- **Depth limit**: maximum recursion depth
- **List-length limit**: maximum length of a constructed list (`range` is checked before it allocates)

Exceeding a limit produces an error (`StepLimitExceeded`, `DepthExceeded`, or `ListLengthExceeded`), not an infinite hang.

## Using in the CLI

```bash
# Evaluate an expression (prints the result as JSON)
schema expr eval "2 + 3 * 4"

# Parse and pretty-print
schema expr parse "\x -> x + 1"

# Interactive REPL
schema expr repl
```

## Further Reading

- [Tutorial Ch. 20: Value-Dependent Transforms](https://panproto.dev/tutorial/chapters/20-value-dependent-transforms.html)
- [Tutorial Ch. 21: Querying Instances](https://panproto.dev/tutorial/chapters/21-querying-instances.html)
</content>
</invoke>
