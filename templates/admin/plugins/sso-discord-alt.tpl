<div class="row">
    <div class="col-sm-2 col-xs-12 settings-header">Discord SSO</div>
    <div class="col-sm-10 col-xs-12">
        <div class="alert alert-info">
            <ol>
                <li>
                    Create a <strong>Discord Application</strong> via the
                    <a href="https://discordapp.com/developers/applications/me">API Console</a> and then paste
                    your application details here.
                </li>
                <li>
                    Ensure your application's redirect URI matches your NodeBB installation. For example, if your NodeBB lives at
                    https://nodebb.example.com/, then you'd supply 'https://nodebb.example.com/auth/discord/callback' as the URI.
                </li>
            </ol>
        </div>
        <form role="form" class="sso-discord-alt-settings">
            <div class="form-group">
                <label for="discord_app_id">Client ID</label>
                <input type="text" id="discord_app_id" name="id" title="Client ID" class="form-control input-lg" placeholder="Client ID">
            </div>
            <div class="form-group">
                <label for="discord_secret">Secret</label>
                <input type="text" id="discord_secret" name="secret" title="Client Secret" class="form-control" placeholder="Client Secret">
            </div>
            <div class="form-group">
                <label for="override_url">Bot Token</label>
                <p>Used for pulling information from Discord (such as avatars).</p>
                <input type="text" id="discord_token" name="token" title="Bot Token" class="form-control input-lg" placeholder="Enter token here">
            </div>
            <div class="checkbox">
                <label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
                    <input type="checkbox" class="mdl-switch__input" name="autoconfirm">
                    <span class="mdl-switch__label">Skip email verification for people who register using SSO?</span>
                </label>
            </div>
            <div class="form-group">
                <label for="override_url">Path Url Override</label>
                <p>This is primarily for local testing, otherwise IGNORE this input. Use http://lvh.me:XXXX instead of localhost.</p>
                <input type="text" id="override_url" name="url" title="Override Url" class="form-control input-lg" placeholder="Enter root URL here">
            </div>

        </form>
    </div>
</div>

<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
    <i class="material-icons">save</i>
</button>
