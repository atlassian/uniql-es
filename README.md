# uniql-es

Based off https://github.com/honeinc/uniql-es. Generates ElasticSearch filters based on
[UniQL](https://github.com/honeinc/uniql) ASTs.

## Installation

    npm install atlassian/uniql-es

## Example

```javascript
var parse = require( 'uniql' );
var esCompile = require( 'uniql-es' );

var ast = parse( '( height <= 20 or ( favorites.color == "green" and height != 25 ) ) and firstname ~= "o.+"' );
var esQuery = esCompile( ast );
console.log( util.inspect( esQuery, { depth: null } ) );
```

Resulting query:

```
  { filter:
	 [ { bool:
		  { must:
			 [ { bool:
				  { should:
					 [ { range: { height: { lte: 20 } } },
					   { bool:
						  { must:
							 [ { term: { 'favorites.color': 'green' } },
							   { bool: { must_not: { term: { height: 25 } } } } ] } } ] } },
			   { bool: { must: { regexp: { firstname: 'o.+' } } } } ] } } ] }
```

## License

[MIT](LICENSE)

