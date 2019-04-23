import React from 'react';
import { Location } from '@reach/router';
import LinkPreview from '../../LinkPreview';
import './styles.scss';

export default class Preview extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      fullPath: ''
    };
  }

  componentDidMount() {
    // eslint-disable-next-line react/no-did-mount-set-state
    const endsWithSlash = window.location.pathname.substr(-1) === '/';
    this.setState({
      fullPath: `${window.location.pathname.substr(0, window.location.pathname.length - (endsWithSlash ? 1 : 0))}-full?component=${
        this.props.heading
      }`
    });
  }

  render() {
    const { children, fullPageOnly, isViewport, viewport = '', lights = true, minHeight, heading, raw, id } = this.props;
    const { fullPath } = this.state;
    const output = { __html: children };
    const background = lights ? '' : 'pf-t-dark pf-m-opaque-200';
    let preview;
    if (raw) {
      preview = (
        <Location>
          {({ location }) => <LinkPreview name={`Component ${id}`} path={`${location.pathname}fullscreen`} />}
        </Location>
      );
    } else if (fullPageOnly) {
      preview = <LinkPreview name={heading} path={fullPath} />;
    } else {
      preview = <div
        className={`Preview__body ${background} ${isViewport ? 'is-viewport' : ''}`}
        style={{ minHeight: minHeight }}
        dangerouslySetInnerHTML={output}
      />;
    }

    return (
      <div className={`Preview ${viewport}`}>
        {preview}
      </div>
    );
  }
}
