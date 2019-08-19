import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { icons } from 'Helpers/Props';
import PageContent from 'Components/Page/PageContent';
import PageContentBodyConnector from 'Components/Page/PageContentBodyConnector';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import Statistics from './Statistics/Statistics';

class Status extends Component {

  //
  // Render

  render() {

    return (
      <PageContent title="Diagnostic Status">
        <PageToolbar>
          <PageToolbarSection>
            <PageToolbarButton
              label="Refresh"
              iconName={icons.REFRESH}
              isSpinning={this.props.isStatusFetching}
              onPress={this.props.onRefreshPress}
            />
          </PageToolbarSection>
        </PageToolbar>
        <PageContentBodyConnector>
          <Statistics
            {...this.props.status}
          />
        </PageContentBodyConnector>
      </PageContent>
    );
  }

}

Status.propTypes = {
  status: PropTypes.object.isRequired,
  isStatusFetching: PropTypes.bool.isRequired,
  onRefreshPress: PropTypes.func.isRequired
};

export default Status;
