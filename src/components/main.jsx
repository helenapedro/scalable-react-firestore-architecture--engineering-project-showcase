import React from 'react';
import styles from './Main.module.css';

const Main = ({ children }) => {
    return (
        <div className={`${styles.main} ${styles['measurement-border']}`}>
            <div className={styles.sheetBackdrop} aria-hidden="true">
                <span className={styles.sheetAxisHorizontal}></span>
                <span className={styles.sheetAxisVertical}></span>
                <span className={styles.sheetTitleBlock}></span>
            </div>
            {children}
        </div>
    );
};

export default Main;
