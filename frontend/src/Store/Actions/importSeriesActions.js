import _ from 'lodash';
import $ from 'jquery';
import { createAction } from 'redux-actions';
import { batchActions } from 'redux-batched-actions';
import getSectionState from 'Utilities/State/getSectionState';
import updateSectionState from 'Utilities/State/updateSectionState';
import getNewSeries from 'Utilities/Series/getNewSeries';
import { createThunk, handleThunks } from 'Store/thunks';
import createHandleActions from './Creators/createHandleActions';
import { set, removeItem, updateItem } from './baseActions';
import { fetchRootFolders } from './rootFolderActions';

//
// Variables

export const section = 'importSeries';
let concurrentLookups = 0;

//
// State

export const defaultState = {
  isFetching: false,
  isPopulated: false,
  error: null,
  isImporting: false,
  isImported: false,
  importError: null,
  items: []
};

//
// Actions Types

export const QUEUE_LOOKUP_SERIES = 'importSeries/queueLookupSeries';
export const START_LOOKUP_SERIES = 'importSeries/startLookupSeries';
export const CLEAR_IMPORT_SERIES = 'importSeries/importSeries';
export const SET_IMPORT_SERIES_VALUE = 'importSeries/clearImportSeries';
export const IMPORT_SERIES = 'importSeries/setImportSeriesValue';

//
// Action Creators

export const queueLookupSeries = createThunk(QUEUE_LOOKUP_SERIES);
export const startLookupSeries = createThunk(START_LOOKUP_SERIES);
export const importSeries = createThunk(IMPORT_SERIES);
export const clearImportSeries = createAction(CLEAR_IMPORT_SERIES);

export const setImportSeriesValue = createAction(SET_IMPORT_SERIES_VALUE, (payload) => {
  return {

    section,
    ...payload
  };
});

//
// Action Handlers

export const actionHandlers = handleThunks({

  [QUEUE_LOOKUP_SERIES]: function(getState, payload, dispatch) {
    const {
      name,
      path,
      term
    } = payload;

    const state = getState().importSeries;
    const item = _.find(state.items, { id: name }) || {
      id: name,
      term,
      path,
      isFetching: false,
      isPopulated: false,
      error: null
    };

    dispatch(updateItem({
      section,
      ...item,
      term,
      queued: true,
      items: []
    }));

    if (term && term.length > 2) {
      dispatch(startLookupSeries());
    }
  },

  [START_LOOKUP_SERIES]: function(getState, payload, dispatch) {
    if (concurrentLookups >= 1) {
      return;
    }

    const state = getState().importSeries;
    const queued = _.find(state.items, { queued: true });

    if (!queued) {
      return;
    }

    concurrentLookups++;

    dispatch(updateItem({
      section,
      id: queued.id,
      isFetching: true
    }));

    const promise = $.ajax({
      url: '/series/lookup',
      data: {
        term: queued.term
      }
    });

    promise.done((data) => {
      dispatch(updateItem({
        section,
        id: queued.id,
        isFetching: false,
        isPopulated: true,
        error: null,
        items: data,
        queued: false,
        selectedSeries: queued.selectedSeries || data[0]
      }));
    });

    promise.fail((xhr) => {
      dispatch(updateItem({
        section,
        id: queued.id,
        isFetching: false,
        isPopulated: false,
        error: xhr,
        queued: false
      }));
    });

    promise.always(() => {
      concurrentLookups--;
      dispatch(startLookupSeries());
    });
  },

  [IMPORT_SERIES]: function(getState, payload, dispatch) {
    dispatch(set({ section, isImporting: true }));

    const ids = payload.ids;
    const items = getState().importSeries.items;
    const addedIds = [];

    const allNewSeries = ids.reduce((acc, id) => {
      const item = _.find(items, { id });
      const selectedSeries = item.selectedSeries;

      // Make sure we have a selected series and
      // the same series hasn't been added yet.
      if (selectedSeries && !_.some(acc, { tvdbId: selectedSeries.tvdbId })) {
        const newSeries = getNewSeries(_.cloneDeep(selectedSeries), item);
        newSeries.path = item.path;

        addedIds.push(id);
        acc.push(newSeries);
      }

      return acc;
    }, []);

    const promise = $.ajax({
      url: '/series/import',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(allNewSeries)
    });

    promise.done((data) => {
      dispatch(batchActions([
        set({
          section,
          isImporting: false,
          isImported: true
        }),

        ...data.map((series) => updateItem({ section: 'series', ...series })),

        ...addedIds.map((id) => removeItem({ section, id }))
      ]));

      dispatch(fetchRootFolders());
    });

    promise.fail((xhr) => {
      dispatch(batchActions(
        set({
          section,
          isImporting: false,
          isImported: true
        }),

        addedIds.map((id) => updateItem({
          section,
          id,
          importError: xhr
        }))
      ));
    });
  }
});

//
// Reducers

export const reducers = createHandleActions({

  [CLEAR_IMPORT_SERIES]: function(state) {
    return Object.assign({}, state, defaultState);
  },

  [SET_IMPORT_SERIES_VALUE]: function(state, { payload }) {
    const newState = getSectionState(state, messagesSection);
    const items = newState.items;
    const index = _.findIndex(items, { id: payload.id });

    newState.items = [...items];

    if (index >= 0) {
      const item = items[index];

      newState.items.splice(index, 1, { ...item, ...payload });
    } else {
      newState.items.push({ ...payload });
    }

    return updateSectionState(state, messagesSection, newState);
  }

}, defaultState, section);
