// SERVER LIBS
import Starknet  from './starknet'
import XDC       from './xdc'

type Dictionary = { [key:string]:any }

const Chains:Dictionary = {
  'Starknet':  Starknet,
  'XDC':       XDC
}

export default Chains