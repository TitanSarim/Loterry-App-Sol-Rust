import Header from "../components/Header";
import PotCard from "../components/PotCard";
import Table from "../components/Table";
import style from "../styles/Home.module.css";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { AppProvider } from "../context/context";

require("@solana/wallet-adapter-react-ui/styles.css");

export default function Home() {

  const endPoint = "https://cosmological-thrumming-sponge.solana-devnet.quiknode.pro/b36f12a18c8b64b081fba6fc2f8b7c7d92ea8eec"

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  )



  return (
      <ConnectionProvider  endpoint={endPoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <AppProvider>
              <div className={style.wrapper}>
                <Header />
                <PotCard />
                <Table />
              </div>
            </AppProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    
  );
}
