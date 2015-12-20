```
const translator = Translator({
  defaultLocale: 'en-GB',
  delimiters: ['{{', '}}'],
  locales: {
    'en-GB': {
      words: {
        'test': {
          'test2': 'Test {{name}}!'
        }
      },
      converters: {}
    }
  }
});

const translated = translator.translate('test.test2', {
  name: 'Bob'
});

// returns 'Test Bob!'
```

for a full specification of the {@link Translator} class please refer to it's documentation.