import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BN } from '@project-serum/anchor';
import {SystemProgram, LAMPORTS_PER_SOL} from '@solana/web3.js' 
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { bs58 } from "bs58";
import { getLotteryAddress, getMasterAddress, getProgram, getTicketAddress, getTotalPrize } from "../utils/program";
import toast from "react-hot-toast";
import { confirmTx, mockWallet } from "../utils/helper";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {

  const [masterAddress, setMasterAddress] = useState();
  const [initialized, setInitialized] = useState(false);
  const [lotteryId, setLotteryId] = useState();
  const [lotteryPot, setLotteryPot] = useState();
  const [lottery, setLottery] = useState()
  const [lotterAddress, setLotterAddress] = useState();
  const [userWinningId, setUserWinningId] = useState(false)
  const [lotteryHistory, setLotteryHistory] = useState([])

  // get provider
  const {connection} = useConnection();
  const wallet = useAnchorWallet();
  const program = useMemo(() => {
    if(connection){
      return getProgram(connection, wallet ?? mockWallet());
    }
  }, [connection, wallet]);


  useEffect(() => {
    updateState()
  }, [program])

  useEffect(() => {
    if(!lottery){
      return
    }
    getPot()
    getHistory()
  }, [lottery])

  const updateState = async() => {
    if(!program){
      return;
    } 

    try {
      if(!masterAddress){
        // get master address
        const masterAddress = await getMasterAddress()
        setMasterAddress(masterAddress)
      }
      const master = await program.account.master.fetch(
        masterAddress ?? (await getMasterAddress())
      )
      setInitialized(true)
      setLotteryId(master.lastId)
      const lotteryAddress = await getLotteryAddress(master.lastId);
      setLotterAddress(lotteryAddress)
      const lottery = await program.account.lottery.fetch(lotteryAddress)
      setLottery(lottery)

      // get users tickets for the current lottery
      if(!wallet?.publicKey){
        return 
      }
      const userTickets = await program.account.ticket.all()
      // filter
      // [
      //   {
      //     memcmp: {
      //       bytes: bs58.encode(new BN(lotteryId).toArrayLike(Buffer, 'le', 4)),
      //       offset: 12,
      //     },
      //   },
      //   {memcmp : {bytes: wallet.publicKey.toBase58(), offset: 16}}
      // ]

      // check whether any of the user tickets win
      const userWin = userTickets.some(
        (t) => t.account.id === lottery.winnerId
      );
      
      if(userWin){
        setUserWinningId(lottery.winnerId)
      }else{
        setUserWinningId(null)
      }
    } catch (error) {
      console.log(error.message)
      
    }
  }

  // get pot
  const getPot = async () => {
    const pot = getTotalPrize(lottery)
    setLotteryPot(pot)
  }

  const getHistory = async () => {
    if(!lottery) return
    
    const history = []

    for(const i in new Array(lotteryId).fill(null)){
      const id = lotteryId - parseInt(i)
      if(!id) break

      const lotteryAddress = await getLotteryAddress(id)
      const lottery = await program.account.lottery.fetch(lotteryAddress);
      const winnerId = lottery.winnerId;
      if(!winnerId){
        continue
      }
      const ticketAddress = await getTicketAddress(lotteryAddress, winnerId)
      const ticket  = await program.account.ticket.fetch(ticketAddress);

      history.push({
        lotteryId: id,
        winnerId,
        winnerAddress: ticket.authority,
        prize: getTotalPrize(lottery)
      })
    }

    setLotteryHistory(history)
  }

  // Call solana program instructios
  const initMaster = async () => {
    try {
      const txHash = await program.methods
        .initMaster()
        .accounts({
          master: masterAddress,
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId
        })
        .rpc()
        await confirmTx(txHash, connection)
        updateState()
        toast.success("Account Connected")
    } catch (error) {
      console.log(error)
      toast.error("Error", error.message)
    }
  }

  // create lottery
  const createLottery = async () =>{
    try { 
        const lotteryAddress = await getLotteryAddress(lotteryId + 1) // here we will get pda or public key 
        const txHash = await program.methods
        .createLottery(new BN(4).mul(new BN(LAMPORTS_PER_SOL)))
        .accounts({
          lottery: lotteryAddress,
          master: masterAddress,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId
        })
        .rpc()
        await confirmTx(txHash, connection)

        updateState()
        toast.success("Lottery Created");
    } catch (error) {
      console.log("Error", error.message)
      toast.error("Error", error.message)
    }
  }

  const buyTicket = async () => {
    try {
      const txHash = await program.methods
      .buyTicket(lotteryId)
      .accounts({
        lottery: lotterAddress,
        ticket: await getTicketAddress(lotterAddress, lottery.lastTicketId + 1),
        buyer: wallet.publicKey,
        systemProgram: SystemProgram.programId
      }).rpc()

      await confirmTx(txHash, connection)
      toast.success("Bought a ticket")
      updateState()
    } catch (error) {
      toast.error("Error", error.message)
      console.log("Error", error.message)
    }
  }


  const pickWinner = async () => {
    try {

      const txHash = await program.methods
        .pickWinner(lotteryId)
        .accounts({
          lottery: lotterAddress,
          authority: wallet.publicKey
        }).rpc()
        await confirmTx(txHash, connection)
        updateState()
        toast.success("Winner Choosen")
    } catch (error) {
      console.log("Error", error.message)
      toast.error(error.message)
    }
  }

  const claimPrize = async () => {
    try {
      const txhHash = await program.methods
        .claimPrice(lotteryId, userWinningId)
        .accounts({
          lottery: lotterAddress,
          ticket: await getTicketAddress(lotterAddress, userWinningId),
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId
        }).rpc()

        await confirmTx(txhHash, connection)
        updateState()
        toast.success("Pize Claimed")
    } catch (error) {
      console.log(error.message)
      toast.error(error.message)
    }
  }

  return (
    <AppContext.Provider
      value={{
        // Put functions/variables you want to bring out of context to App in here
        connected: wallet?.publicKey ? true : false,
        isMasterInitialized: initialized,
        lotteryId,
        initMaster,
        createLottery,
        isLotteryAuthority: wallet && lottery && wallet.publicKey.equals(lottery.authority),
        isFinished: lottery && lottery.winnerId,
        canClaim: lottery && !lottery.claimed && userWinningId,
        lotteryPot,
        buyTicket,
        lotteryHistory,
        pickWinner,
        claimPrize
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  return useContext(AppContext);
};
