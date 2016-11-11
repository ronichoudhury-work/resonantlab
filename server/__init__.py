"""Entry point for serverside portion of Resonant Lab plugin."""

import os

import yaml

from girder.api import access
from girder.api.describe import Description, describeRoute
from girder.api.rest import Resource
from girder.utility.plugin_utilities import registerPluginWebroot


class ResonantLab(Resource):
    """Girder resource definition for Resonant Lab."""

    _cp_config = {'tools.staticdir.on': True,
                  'tools.staticdir.index': 'index.html'}

    def __init__(self, version=None):
        """Initialize."""
        super(ResonantLab, self).__init__()

        self.version = version

        self.resourceName = 'resonantlab'

        self.route('GET', ('build', 'version'), self.get_version)

    @access.public
    @describeRoute(
        Description('''Get Resonant Lab's current version number.''')
    )
    def get_version(self, params):
        """Return Resonant Lab version number."""
        return self.version


def load(info):
    """Girder plugin loading hook for Resonant Lab."""
    # Compute full path to plugin's index.html file.
    ResonantLab._cp_config['tools.staticdir.dir'] = os.path.join(info['pluginRootDir'], 'web_external')

    # Read the version number from the plugin specification file.
    config_file = os.path.join(info['pluginRootDir'], 'plugin.yml')
    with open(config_file) as f:
        config = yaml.safe_load(f)

    # Instantiate ResonantLab resource and register the plugin with Girder.
    app = info['apiRoot'].resonantlab = ResonantLab(version=config.get('version'))
    registerPluginWebroot(app, info['name'])
