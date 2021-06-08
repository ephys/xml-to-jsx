import * as React from 'react';
import renderer from 'react-test-renderer';
import { TTagMap, XmlToJsx } from '.';

describe('XmlToJsx', () => {

  it('Converts XML tags into react-dom elements', () => {
    const xml = 'I am a message with <strong>strong text</strong>';

    const component = renderer.create(<XmlToJsx xml={xml} />);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('Converts HTML tags into react-dom elements', () => {
    const xml = 'I am a message with <strong>strong text</strong>';

    const component = renderer.create(<XmlToJsx xml={xml} asHtml />);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('Parses unclosed tags properly (if html spec declares them as self-closing)', () => {
    const xml = 'I am a message with an unclosed image <img src="http://placehold.it/250x250" alt=""> and <strong>strong text</strong>';

    const component = renderer.create(<XmlToJsx xml={xml} asHtml />);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('Maps XML tags to react-dom components', () => {

    const xml = 'This text should be <italic>italic</italic>';
    const tags: TTagMap = {
      italic: 'em',
    };

    const component = renderer.create(<XmlToJsx xml={xml} tags={tags} />);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('Maps XML tags to custom react components', () => {

    function MyComponent(props) {
      return <em {...props} />;
    }

    const xml = 'This text should be <italic>italic</italic>';
    const tags = {
      italic: MyComponent,
    };

    const component = renderer.create(<XmlToJsx xml={xml} tags={tags} />);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('Maps XML tags to custom react elements', () => {

    const xml = 'Hey check out my <blog-link>blog</blog-link>!';
    const tags = {
      'blog-link': <a href="https://my-blog.co.uk" />,
    };

    const component = renderer.create(<XmlToJsx xml={xml} tags={tags} />);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('Merges XML and JSX attributes (XML takes precedence)', () => {

    const xml = 'Hey check out my <blog-link href="https://my-blog.fr">blog</blog-link>!';
    const tags = {
      'blog-link': <a href="https://example.com" rel="noopener noreferrer" />,
    };

    const component = renderer.create(<XmlToJsx xml={xml} tags={tags} />);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('removes all tags not in a whitelist if one is provided', () => {
    const xml = '<disallowed-tag>Should not be here <allow-tag-1>nor this</allow-tag-1></disallowed-tag><allow-tag-2>Should be here</allow-tag-2>';

    const component = renderer.create(<XmlToJsx xml={xml} allowTags={['allow-tag-1', 'allow-tag-2']} />);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('removes all tags present in a blacklist if one is provided', () => {
    const xml = `<disallowed-tag>Should not be here <allow-tag-1>nor this</allow-tag-1></disallowed-tag><allow-tag-2>Should be here</allow-tag-2>`;

    const component = renderer.create(<XmlToJsx xml={xml} disallowTags={['disallowed-tag']} />);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('throws if both a whitelist and blacklist are provided', () => {
    const xml = '<div>Should not be here <p>nor this</p></div><span>Should be here</span>';

    expect(() => {
      renderer.create(<XmlToJsx xml={xml} allowTags={['span', 'p']} disallowTags={['div']} />);
    }).toThrow();
  });

  it('Accepts XML that starts with an XML header', () => {
    const xml = '<?xml version="1.0" ?><div>Hello!</div>';

    const component = renderer.create(<XmlToJsx xml={xml} />);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('Throws if the string is not valid XML', () => {
    const xml = '<span><div>Hello!</span></div>';

    expect(() => {
      renderer.create(<XmlToJsx xml={xml} />);
    }).toThrow();
  });

  it('Throws if the string contains parsererror', () => {
    const xml = '<parsererror>parsererror is reserved by DOMParser</div>';

    expect(() => {
      renderer.create(<XmlToJsx xml={xml} />);
    }).toThrow();
  });
});
