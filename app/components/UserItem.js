import React, { Component } from 'react';
import {
  Text,
  View,
  StyleSheet
} from 'react-native';
import Color from '../stylesheets/Pallete';
import getColor from '../utils/color';

var styles = StyleSheet.create({
  avatar: {
    backgroundColor: Color.primary,
    borderRadius: 25,
    height: 40,
    width: 40,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },

  userItem: {
    height: 40,
    marginTop: 15,
    flex: 1,
    flexDirection: 'row'
  },

  name: {
    paddingLeft: 5,
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 5,
  },

  nameText: {
    color: Color.gray
  },

  icons: {
    flex: 1,
    backgroundColor: Color.gray
  },

  avatarText: {
    color: Color.white,
    fontSize: 15
  }
})

class UserItem extends Component {
  render() {
    const user = this.props.user;

    let avatarStyle = {
      backgroundColor: getColor(user),
      borderRadius: 25,
      height: 40,
      width: 40,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }

    return (
      <View style={styles.userItem}>
        <View style={avatarStyle}>
          <Text style={styles.avatarText}>{user.slice(0, 2)}</Text>
        </View>
        <View style={styles.name}>
          <Text>{user}</Text>
        </View>
        <View style={styles.icons}>
          <Text>lul</Text>
        </View>
      </View>
    );
  }
}

export default UserItem;
