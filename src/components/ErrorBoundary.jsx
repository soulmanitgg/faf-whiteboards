import React from 'react';

// Insulates the rest of the app from a crash inside the editor (e.g. an
// Excalidraw internal error), showing a recoverable message instead of a
// blank screen.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Editor error:', error, info);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="editor-overlay">
          <div className="ed-error">
            <div className="ed-error-title">Something went wrong in the editor</div>
            <div className="ed-error-sub">Your board is saved. You can go back and reopen it.</div>
            <button className="btn btn-primary" onClick={this.reset}>Back to boards</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
