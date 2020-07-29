# NodeBB Discord OAuth2 SSO 

This plugin for [NodeBB](https://github.com/NodeBB/NodeBB/) provides a way to register/authenticate users against
[Discord](https://discordapp.com/). When enabled, and configured properly, there will be a
Discord icon available on the login screen. Click that icon to authenticate
against Discord.

New users who register using Discord should have their avatar carry over automatically rather than using the default avatar.

## Config

1. Create an application -- https://discordapp.com/developers/applications/me
2. Ensure the application's URI ends with `/auth/discord/callback`
3. Create a bot for your application
4. Fill in the id, secret, and bot token for the application via the NodeBB admin control panel (under "Social Authentication")
5. Replace your NodeBB FontAwesome fonts with the custom ones included (See below)
6. Edit your theme's profile.tpl to include a section for Discord information. (See below)

## Using the Discord Logo:

I have included a modified version of the FontAwesome font that replaces the Discover card (fa-cc-discover) with a simplified Discord logo. I've picked Discover to overwrite because it starts with the same letters, so it's intuitive to search in the NodeBB icon box in case you want to use it elsewhere.

You'll have to patch this manually by replacing the font files in [public/vendor/fontawesome/fonts/](https://github.com/NodeBB/NodeBB/tree/master/public/vendor/fontawesome/fonts) with the ones in the [fontawesome-discoverToDiscord folder](https://github.com/selkkie/nodebb-plugin-sso-discord-with-logo/tree/master/fontawesome-discoverToDiscord).
I recommend keeping a copy of the folder itself in the font folder so that you can replace everything quickly everytime NodeBB upgrades, since they'll get overwritten with the default FontAwesome fonts.

If using the Discover card is unacceptable for you, you can do what I did and make your own version of the FontAwesome font using [FontForge](https://github.com/fontforge/fontforge). Just open up [one of the standard FontAweesome fonts included in NodeBB](https://github.com/NodeBB/NodeBB/tree/master/public/vendor/fontawesome/fonts), scroll down to the icon you want to replace (they're buried deep), delete it and import the svg of your choice. Then export all of the filetypes and replace them in the fontawesome folder.

## Profile Information
A quick panel of the user's full username and their avatar from discord can be added to their profile.
Just modify profile.tpl and use
```
    <!-- IF discordData -->
    <div class="panel panel-default">
        <div class="panel-body text-center">
            <!-- IMPORT partials/account/discord_profile_panel.tpl -->
        </div>
    </div>
    <!-- ENDIF discordData -->
```
or, if you'd like to inject the data directly, use variables such as {discordData.username}.
Currently you can access username, discriminator, id, and pfp (avatar URL), but theoretically any information that can be pulled from Discord.js can be added to [DiscordAuth.filterAccount](https://github.com/selkkie/nodebb-plugin-sso-discord-with-logo/blob/master/library.js#L331).

## Local Testing URL Override

I've added a setting in the admin panel that allows a workaround when testing local setups. Localhost isn't a valid OAuth URL, so to bypass this you can use [http://lvh.me](http://lvh.me), which will always resolve to 127.0.0.1. Just enter http://lvh.me:4567 (or whatever your port number is).
(Don't forget to add lvh.me to your application URI in the discord application settings as well!)

## To Do
* Adjust inconsistencies. SSO sometimes prompts to reauth in profile, and multiple users can auth one account.
* Remove association button?
* Clone and upload avatar locally instead of linking to Discord server
* Add button to Profile Picture editor that allows you to pull your avatar from Discord?

## Acknowledgements

This plugin is built from the one at [https://github.com/jsumners/nodebb-plugin-sso-discord-alt](https://github.com/jsumners/nodebb-plugin-sso-discord-alt).

## License

[MIT License](http://jsumners.mit-license.org/)