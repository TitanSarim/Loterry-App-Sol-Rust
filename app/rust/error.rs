use anchor_lang::prelude::error_code;

#[error_code]
pub enum LotteryError {
    #[msg("Winner Already Exists")]
    WinnerAlreadyExists,

    #[msg("Can't choose a winner when there are no tickets")]
    NoTicket,

    #[msg("Winner has not been chosen")]
    WinnerNotChosen,

    #[msg("Invalid Winner")]
    InvalidWinner,

    #[msg("The Price has already claimed")]
    AlreadyClaimed,
}
