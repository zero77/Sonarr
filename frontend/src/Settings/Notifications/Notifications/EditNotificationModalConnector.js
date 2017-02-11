import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { clearPendingChanges } from 'Store/Actions/baseActions';
import { cancelTestNotification, cancelSaveNotification } from 'Store/Actions/settingsActions';
import EditNotificationModal from './EditNotificationModal';

function createMapDispatchToProps(dispatch, props) {
  return {
    dispatchClearPendingChanges() {
      dispatch(clearPendingChanges);
    },

    dispatchCancelTestNotification() {
      dispatch(cancelTestNotification);
    },

    dispatchCancelSaveNotification() {
      dispatch(cancelSaveNotification);
    }
  };
}

class EditNotificationModalConnector extends Component {

  //
  // Listeners

  onModalClose = () => {
    this.props.dispatchClearPendingChanges({ section: 'notifications' });
    this.props.dispatchCancelTestNotification({ section: 'notifications' });
    this.props.dispatchCancelSaveNotification({ section: 'notifications' });
    this.props.onModalClose();
  }

  //
  // Render

  render() {
    const {
      dispatchClearPendingChanges,
      dispatchCancelTestNotification,
      dispatchCancelSaveNotification,
      ...otherProps
    } = this.props;

    return (
      <EditNotificationModal
        {...otherProps}
        onModalClose={this.onModalClose}
      />
    );
  }
}

EditNotificationModalConnector.propTypes = {
  onModalClose: PropTypes.func.isRequired,
  dispatchClearPendingChanges: PropTypes.func.isRequired,
  dispatchCancelTestNotification: PropTypes.func.isRequired,
  dispatchCancelSaveNotification: PropTypes.func.isRequired
};

export default connect(null, createMapDispatchToProps)(EditNotificationModalConnector);
