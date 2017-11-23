import wepy from 'wepy'
import config from '../config'
import {httpPost} from './http'
import { Base64 } from 'js-base64'

function getTokenPayload() {
  let token = wepy.getStorageSync('jwt')
  if (!token){
    return null
  }
  let payload = token.split('.')[1]
  payload = JSON.parse(Base64.decode(payload))
  return payload
}

class userMixin extends wepy.mixin {
  isFunction(item) {
    // no re-use within mixin, may as well rewrite it once more
    return typeof item === 'function'
  }

  $getTokenPayload() {
    return getTokenPayload()
  }
  // helper method for page action after user login
  // TODO
  $ensureLogin() {
    if (!this.$parent || !this.$parent.$updateGlobalData) {
      // for error config
      return Promise.reject('Error config, should be used in a component')
    }
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if(this.$parent.globalData.loginInited){
          resolve()
        } else {
          resolve( this.$ensureLogin() )
        }
      }, 100)
    })
  }

  $getUserInfo() {
    if (!this.$parent || !this.$parent.$updateGlobalData) {
      // for error config
      return Promise.resolve({})
    }
    // from cache
    const user = this.$parent.$updateGlobalData('user')
    // no more ajax request
    if (user && user.nickname) {
      return Promise.resolve(user)
    }
    
    return this.$login()
        .then(() => {
          return this.$prepareUserInfo()
        })
  }

  // $checkToken() {
  //   // since ali has no checkSession equivalent, I will not implement this method
  //   wepy.checkSession
  // }

  $login() {
    // login will set localStorage jwt
    // if we need to actually request a login for both wx/ali and backend
    // since ali has on sth like checkSession, we login everytime
    return wepy.login()
      .then((res) => {
        console.log('wepy.login.success:', res)
        return httpPost({ url: '/auth/code-to-token', 
          data: {
            code: res.code,
            source: config.source
          }}).then(({data}) => {
            wepy.setStorageSync('jwt', data.token)
          })
      }).catch((error) => {
        console.log('wepy.login.failed:', error)
        throw error
      })
  }

  $prepareUserInfo() {
    return wepy.getUserInfo()
      .then((res) => {
        console.log('wepy.getUserInfo.success:', res)
        // sync with backend server and use result from backend server as validated data
        return this.$post({ url: `/account/encrypted-profile`, 
          data: {
            encrypted_data: res.encryptedData,
            iv: res.iv
          }}).then(({data}) => {
            data.avatarUrl = data.avatar_url
            delete data.avatar_url
            const user = this.$parent.$updateGlobalData('user', data)
            return user
          })
      }).catch((res) => {
        console.log('wepy.getUserInfo.fail:', res)
        const user = this.$parent.$updateGlobalData('user', {
          nickname: '未授权',
          avatarUrl: '/images/icon/icon-avatar@2x.png'
        })
        // maybe user just not granting userInfo
        this.$requestAuthModal()
        return user
      })
  }

  // 提示用户开启授权
  $requestAuthModal() {
    return wepy.showModal({
      title: '授权提示',
      content: 'BookMall希望获得以下权限：\n · 获取您的公开信息（昵称、头像等）',
      confirmText: '去授权',
      cancelText: '先不授权'
    }).then((res) => {
      if (res.confirm) {
        console.log('_wxAuthModal.showModal: 用户点击确定', res)
        return this.$openSetting()
      }
    })
  }

  // 打开授权页
  $openSetting() {
    return wepy.openSetting()
      .then((authSetting) => {
        console.log('wx.openSetting.success', authSetting)
        if (authSetting['scope.userInfo']) {
          // redo $prepareUserInfo
          this.$prepareUserInfo()
        }
      })
  }
}

export {
  getTokenPayload,
  userMixin as default
}