import PropTypes from 'prop-types';
import ReactMonacoEditor from 'react-monaco-editor';

// All editor features
import 'monaco-editor/esm/vs/editor/editor.all';

// csharp&json language
import 'monaco-editor/esm/vs/basic-languages/csharp/csharp';
import 'monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import 'monaco-editor/esm/vs/language/json/jsonWorker';
import 'monaco-editor/esm/vs/language/json/jsonMode';

// Create a WebWorker from a blob rather than an url
import * as EditorWorker from 'worker-loader?inline=true&fallback=false!monaco-editor/esm/vs/editor/editor.worker';
import * as JsonWorker from 'worker-loader?inline=true&fallback=false!monaco-editor/esm/vs/language/json/json.worker';

self.MonacoEnvironment = {
  getWorker: (moduleId, label) => {
    if (label === 'editorWorkerService') {
      return new EditorWorker();
    }
    if (label === 'json') {
      return new JsonWorker();
    }
    return null;
  }
};

class MonacoEditor extends ReactMonacoEditor {

  // ReactMonacoEditor should've been PureComponent
  shouldComponentUpdate(nextProps, nextState) {
    for (const key in nextProps) {
      if (this.props[key] !== nextProps[key]) {
        return true;
      }
    }

    return false;
  }
}

export default MonacoEditor;
