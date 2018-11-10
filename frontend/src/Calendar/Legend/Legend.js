import PropTypes from 'prop-types';
import React from 'react';
import { icons, kinds } from 'Helpers/Props';
import LegendItem from './LegendItem';
import LegendIconItem from './LegendIconItem';
import styles from './Legend.css';

function Legend(props) {
  const {
    showFinaleIcon,
    showCutoffUnmetIcon,
    colorImpairedMode
  } = props;

  return (
    <div className={styles.legend}>
      <div>
        <LegendItem
          status="unaired"
          tooltip="Episode hasn't aired yet"
          colorImpairedMode={colorImpairedMode}
        />

        <LegendItem
          status="unmonitored"
          tooltip="Episode is unmonitored"
          colorImpairedMode={colorImpairedMode}
        />
      </div>

      <div>
        <LegendItem
          status="downloading"
          tooltip="Episode is currently downloading"
          colorImpairedMode={colorImpairedMode}
        />

        <LegendItem
          status="downloaded"
          tooltip="Episode was downloaded and sorted"
          colorImpairedMode={colorImpairedMode}
        />
      </div>

      <div>
        <LegendIconItem
          name="Premiere"
          icon={icons.INFO}
          kind={kinds.INFO}
          tooltip="Series or season premiere"
        />

        {
          showFinaleIcon &&
            <LegendIconItem
              name="Finale"
              icon={icons.INFO}
              kind={kinds.WARNING}
              tooltip="Series or season finale"
            />
        }

        {
          !showFinaleIcon && showCutoffUnmetIcon &&
            <LegendIconItem
              name="Cutoff Not Met"
              icon={icons.EPISODE_FILE}
              kind={kinds.WARNING}
              tooltip="Quality or language cutoff has not been met"
            />
        }
      </div>

      {
        showFinaleIcon && showCutoffUnmetIcon &&
          <div>
            <LegendIconItem
              name="Cutoff Not Met"
              icon={icons.EPISODE_FILE}
              kind={kinds.WARNING}
              tooltip="Quality or language cutoff has not been met"
            />
          </div>
      }
    </div>
  );
}

Legend.propTypes = {
  showFinaleIcon: PropTypes.bool.isRequired,
  showCutoffUnmetIcon: PropTypes.bool.isRequired,
  colorImpairedMode: PropTypes.bool.isRequired
};

export default Legend;
