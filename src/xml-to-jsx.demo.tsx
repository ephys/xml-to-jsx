import React from 'react';
import DesktopContainer from '../DesktopContainer';
import { Anchor, Text, Title2 } from '../wysiwyg/wysiwyg';
import { xmlToJsx } from '.';

export default function XmlToJsxDemo() {

  return (
    <DesktopContainer style={{ padding: '16px' }}>
      <Title2>XmlToJsx</Title2>
      <Text>This is a technical demo of a component that parses raw XML and converts it to live react elements.</Text>
      {xmlToJsx(`
    <img src="https://placekitten.com/200/300" alt="A kitten" />
    <p>I am a paragraph!</p>
    <ul>
      <li>I am a list element</li>
      <li>I am a list element</li>
      <li>I am a list element</li>
      <li>I am a list element</li>
    </ul>
    <link-to-google target="_blank">To google!</link-to-google>
    <custom-component color="red" />
    <script>
      document.body.innerHTML = 'This blacklisted script has been executed!';    
    </script>
  `, {
        tags: {
          // add fontSize of p elements (here we define a new component)
          p: props => <Text style={{ fontSize: '1.5rem' }} {...props} />,

          // add target blank to a (here we merge the props of two component instances, xml takes priority)
          'link-to-google': <Anchor to="https://google.be" />,

          'custom-component': CustomComponent,
        },

        // we recommend you use a whitelist instead!
        disallowTags: ['script'],
      })}
    </DesktopContainer>
  );
}

XmlToJsxDemo.displayName = 'XmlToJsx';

function CustomComponent(props: { color: string }) {

  return (
    <div style={{ background: props.color || 'blue', height: '100px', width: '100px' }}>
      Custom Component!
    </div>
  );
}
