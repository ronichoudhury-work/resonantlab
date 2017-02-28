import { select } from 'd3-selection';

import html from './index.jade';
import './index.styl';

import closeIcon from '~reslab/image/close.svg';
import publicFileIcon from '~reslab/image/publicFile.svg';
import privateFileIcon from '~reslab/image/privateFile.svg';

import { store } from '~reslab/redux/store';
import { action } from '~reslab/redux/action';
import { appMode } from '~reslab/redux/reducer';
import { gatherProjectInfo } from '~reslab/util';

const initialize = (sel) => {
  sel.html(html({
    closeIcon
  }));

  sel.select('.close-overlay')
    .on('click', () => store.dispatch(action.lastMode()));
};

const render = (publicProj, privateProj) => {
  const main = select('.overlay.open-project-dialog');
  showProjects(main, '.public-projects', publicProj, publicFileIcon);
  showProjects(main, '.private-projects', privateProj, privateFileIcon);
};

const showProjects = (main, selector, projects, fileIcon) => {
  console.log(projects);

  const sel = main.select(selector)
    .style('display', projects.length > 0 ? null : 'none')
    .select('.project-list');

  sel.selectAll('*')
    .remove();

  const icon = sel.selectAll('.circle-button')
    .data(projects)
    .enter()
    .append('div')
    .on('click', d => {
      store.dispatch(action.switchMode(appMode.project));

      const project = gatherProjectInfo(d);
      store.dispatch(action.openProject(project.id, project.name));
    })
    .classed('circle-button', true);

  icon.append('img')
    .classed('project-glyph', true)
    .attr('src', fileIcon);

  icon.append('span')
    .text(d => d.name);
};

export {
  initialize,
  render
};