'use strict'

const User = module.parent.require('./user')
const InternalOAuthError = require('passport-oauth').InternalOAuthError
const OAuth2Strategy = require('passport-oauth').OAuth2Strategy
const meta = module.parent.require('./meta')
const db = module.parent.require('../src/database')
const passport = module.parent.require('passport')
const nconf = module.parent.require('nconf')
const winston = module.parent.require('winston')
const async = module.parent.require('async')
const authenticationController = module.parent.require('./controllers/authentication')
const quickFormat = require('quick-format')

const client = new (require('discord.js')).Client()

meta.settings.get('sso-discord-alt', function (err, settings) {
  if (err) return console.log(err)
  if (!settings.token) {
    return console.log('No token found!')
  } else client.login(settings.token)
})

client.on('ready', () => {
  console.log('OAuth bot logged in succesfully.')
})

function doLog () {
  const args = Array.from(arguments)
  const method = args.splice(0, 1)[0]
  const formatStr = '[sso-discord-alt] ' + args.splice(0, 1)[0]
  method.call(winston, quickFormat([formatStr].concat(args)))
}

function log () {
  doLog.apply(null, [winston.verbose].concat(Array.from(arguments)))
}

function logError () {
  doLog.apply(null, [winston.error].concat(Array.from(arguments)))
}

function logWarn () {
  doLog.apply(null, [winston.warn].concat(Array.from(arguments)))
}

function capitalize ([first, ...rest]) {
  return [first.toUpperCase(), ...rest].join('')
}

const constants = {
  name: 'discord',
  admin: {
    route: '/plugins/sso-discord-alt',
    icon: 'fa-cc-discover'
  },
  oauth: { // a passport-oauth2 options object
    authorizationURL: 'https://discordapp.com/api/v6/oauth2/authorize',
    tokenURL: 'https://discordapp.com/api/v6/oauth2/token',
    passReqToCallback: true
  },
  userRoute: 'https://discordapp.com/api/v6/users/@me'
}

const DiscordAuth = {}

/**
 * Invoked by NodeBB when initializing the plugin.
 *
 * @param {object} data Provides some context information.
 * @param {function} callback Invokec when initialization is complete.
 */
DiscordAuth.init = function (data, callback) {
  log('initializing')

  function render (req, res, next) {
    log('rendering admin view')
    res.render('admin/plugins/sso-discord-alt', {})
  }

  data.router.get('/admin/plugins/sso-discord-alt', data.middleware.admin.buildHeader, render)
  data.router.get('/api/admin/plugins/sso-discord-alt', render)

  callback()
}

DiscordAuth.addMenuItem = function (customHeader, callback) {
  log('adding admin menu item')
  customHeader.authentication.push({
    route: constants.admin.route,
    icon: constants.admin.icon,
    name: constants.name
  })

  callback(null, customHeader)
}

DiscordAuth.getStrategy = function (strategies, callback) {
  log('adding authentication strategy')
  const options = constants.oauth
  options.callbackURL = nconf.get('url') + '/auth/' + constants.name + '/callback'

  meta.settings.get('sso-discord-alt', function (err, settings) {
    if (err) return callback(err)
    if (!settings.id || !settings.secret) {
      logWarn('Missing sso-discord-alt configuration. Not enabling authentication strategy.')
      return callback(null, strategies)
    }

    options.clientID = settings.id
    options.clientSecret = settings.secret
    if (settings.url) options.callbackURL = settings.url + '/auth/' + constants.name + '/callback'

    function PassportOAuth () {
      OAuth2Strategy.apply(this, arguments)
    }
    require('util').inherits(PassportOAuth, OAuth2Strategy)

    /**
         * Invoked by the OAuth2Strategy prior to the verify callback being invoked.
         *
         * @param {string} accessToken API access token as returned by the remote service.
         * @param {function} done Callback to be invoked when profile parsing is finished.
         */
    PassportOAuth.prototype.userProfile = function (accessToken, done) {
      log('getting user profile from remote service')
      this._oauth2._useAuthorizationHeaderForGET = true
      this._oauth2.get(constants.userRoute, accessToken, function (err, body, res) {
        if (err) return done(new InternalOAuthError('failed to fetch user profile', err))
        try {
          log('parsing remote profile information')
          const oauthUser = JSON.parse(body)
          done(null, { // user profile for verify function
            id: oauthUser.id,
            displayName: oauthUser.username,
            email: oauthUser.email,
            provider: constants.name
          })
        } catch (e) {
          done(e)
        }
      })
    }

    const authenticator = new PassportOAuth(options, function verify (req, token, secret, profile, done) {
      log('passport verify function invoked: %j', profile)

      DiscordAuth.login(profile, function (err, user) {
        if (err) return done(err)

        authenticationController.onSuccessfulLogin(req, user.uid)
        done(null, user)
      })
    })
    passport.use(constants.name, authenticator)

    strategies.push({
      name: capitalize(constants.name),
      url: '/auth/' + constants.name,
      callbackURL: `/auth/${constants.name}/callback`,
      icon: constants.admin.icon,
      scope: ['identify', 'email']
    })
    log('authentication strategy added')

    callback(null, strategies)
  })
}

DiscordAuth.getAssociation = function (data, callback) {
  log('determining if user is associated with discord')
  User.getUserField(data.uid, 'discordId', function (err, discordId) {
    if (err) return callback(err, data)
    meta.settings.get('sso-discord-alt', function (err, settings) {
      if (err) return callback(err, data)
      var c = settings.url
      if (!c) c = nconf.get('url')
      if (discordId) {
        log('user is associated with discord')
        data.associations.push({
          associated: true,
          url: 'https://discordapp.com/channels/@me',
          name: capitalize(constants.name),
          icon: constants.admin.icon
        })
      } else {
        log('user is not associated with discord')
        data.associations.push({
          associated: false,
          url: c + '/auth/discord',
          name: capitalize(constants.name),
          icon: constants.admin.icon
        })
      }
    })
    callback(null, data)
  })
}

DiscordAuth.login = function (profile, callback) {
  log('login invoked: %j', profile)
  DiscordAuth.getUidByOAuthid(profile.id, function (err, uid) {
    if (err) {
      logError('could not determine uid from OAuthId: %s', profile.id)
      return callback(err)
    }

    // Existing User
    if (uid !== null) {
      log('user already exists: %s', uid)
      return callback(null, {
        uid
      })
    }

    // New User
    log('determing if new user: %s', uid)
    const success = function (uid) {
      log('updating user record with remote service data: (%s, %s)', profile.id, uid)
      // Save provider-specific information to the user
      User.setUserField(uid, constants.name + 'Id', profile.id)

      db.setObjectField(constants.name + 'Id:uid', profile.id, uid)
      callback(null, {
        uid
      })
    }

    User.getUidByEmail(profile.email, function (err, uid) {
      if (err) {
        logError('could not lookup user by email %s: %s', profile.email, err.message)
        return callback(err)
      }
      if (uid) {
        log('user with email address already exists, merging: %s', profile.email)
        // TODO: this seems easily exploitable
        return success(uid)
      }
      var avatarURL = ''
      log('creating new user: %s', uid)
      client.users.fetch(profile.id).then(fetched => {
        avatarURL = fetched.avatarURL()
        avatarURL.replace(/\.[^/.]+$/, '.png')

        const userFields = {
          username: profile.displayName,
          email: profile.email,
          picture: avatarURL
        }

        User.create(userFields, function (err, uid) {
          if (err) {
            logError('could not create user %s: %s', uid, err.message)
            return callback(err)
          }
          log('user created')
          success(uid)
        })
      })
    })
  })
}

DiscordAuth.getUidByOAuthid = function (oAuthid, callback) {
  db.getObjectField(constants.name + 'Id:uid', oAuthid, function (err, uid) {
    if (err) {
      logError('could not get object field from database %s: %s', oAuthid, err.message)
      return callback(err)
    }
    callback(null, uid)
  })
}

DiscordAuth.deleteUserData = function (idObj, callback) {
  log('deleteUserData invoked: %j', idObj)
  const operations = [
    async.apply(User.getUserField, idObj.uid, constants.name + 'Id'),
    function (oAuthIdToDelete, next) {
      log('deleting oAuthId: %s', oAuthIdToDelete)
      db.deleteObjectField(constants.name + 'Id:uid', oAuthIdToDelete, next)
    }
  ]
  async.waterfall(operations, function (err) {
    if (err) {
      logError('Could not remove OAuthId data for uid %j. Error: %s', idObj.uid, err.message)
      return callback(err)
    }
    log('finished deleting user: %s', idObj.uid)
    callback(null, idObj.uid)
  })
}

module.exports = DiscordAuth
