check:
	npm install
	jshint .
	jscs .

patch:
	npm version patch

minor:
	npm version minor

major:
	npm version major

release:
	git push
	git push --tags

release-patch: check patch release

release-minor: check minor release

release-major: check major release